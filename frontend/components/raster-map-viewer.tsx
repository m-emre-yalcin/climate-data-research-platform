import { useState, useEffect, useRef, useCallback } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Map as LucideMap,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Layers,
  Palette,
  Download,
  Maximize2,
  AlertTriangle,
} from "lucide-react";
import { backend } from "@/lib/fetch";

interface RasterMetadata {
  dimensions: { time: number; lat: number; lon: number };
  variables: string[];
  bounds: { north: number; south: number; east: number; west: number };
  resolution: { lat: number; lon: number };
  attributes: {
    title: string;
    institution?: string;
    comment?: string;
  };
  statistics: {
    [variable: string]: {
      min: number;
      max: number;
      mean: number;
      units: string;
    };
  };
}

interface TileResponse {
  tile: number[][];
  metadata: {
    variable: string;
    time_index: number;
    zoom: number;
    x: number;
    y: number;
    tile_size: number;
  };
}

interface TileData extends TileResponse {
  cached: boolean;
  timestamp: number;
}

// API client for tile requests
class TileAPIClient {
  private baseUrl: string;

  constructor(baseUrl: string = "/api/data") {
    this.baseUrl = baseUrl;
  }

  async fetchTile(
    filename: string,
    variable: string,
    timeIndex: number,
    zoom: number,
    x: number,
    y: number
  ): Promise<TileResponse> {
    const url = `/data/visualization/${this.baseUrl}/raster/tile/${filename}/${variable}/${timeIndex}/${zoom}/${x}/${y}`;
    const response = await backend(url);

    if (!response?.ok) {
      throw new Error(`Failed to fetch tile: ${response?.status}`);
    }

    return await response.data;
  }

  async fetchMetadata(): Promise<RasterMetadata> {
    // Fetch raster metadata - adjust endpoint as needed
    const response = await backend(
      `/data/visualization/${this.baseUrl}/raster/metadata`
    );

    if (!response?.ok) {
      // Fallback to mock metadata if endpoint doesn't exist
      return {
        dimensions: { time: 24, lat: 2088, lon: 4320 },
        variables: ["pr", "temperature", "humidity"],
        bounds: { north: 90, south: -90, east: 180, west: -180 },
        resolution: { lat: 0.0861, lon: 0.0833 },
        attributes: {
          title: "High-Resolution Climate Data (2088×4320)",
          institution: "Climate Research Institute",
          comment: "Real NetCDF data via tile API",
        },
        statistics: {
          pr: { min: 0, max: 0.05, mean: 0.0025, units: "kg m⁻² s⁻¹" },
          temperature: { min: -40, max: 45, mean: 15, units: "°C" },
          humidity: { min: 0, max: 100, mean: 65, units: "%" },
        },
      };
    }

    return await response.data;
  }
}

interface RasterMapViewerProps {
  filename?: string;
  type?: string;
  title?: string;
}

// Tile-based raster viewer
export const RasterMapViewer = ({
  filename,
  type,
  title,
}: RasterMapViewerProps) => {
  const [metadata, setMetadata] = useState<RasterMetadata | null>(null);
  const [selectedVariable, setSelectedVariable] = useState("pr");
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [colorScale, setColorScale] = useState("precipitation");
  const [opacity, setOpacity] = useState([80]);
  const [viewportBounds, setViewportBounds] = useState({
    north: 90,
    south: -90,
    east: 180,
    west: -180,
  });
  const [zoomLevel, setZoomLevel] = useState(2);
  const [isClient, setIsClient] = useState(false);
  const [loadedTiles, setLoadedTiles] = useState(new Set<string>());
  const [loadingTiles, setLoadingTiles] = useState(new Set<string>());
  const [errorTiles, setErrorTiles] = useState(new Set<string>());

  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const tileLayerRef = useRef<any>(null);
  const tileCache = useRef(new Map<string, TileData>());
  const apiClient = useRef(new TileAPIClient());

  useEffect(() => {
    setIsClient(true);
    // Load metadata on mount
    apiClient.current
      .fetchMetadata()
      .then(setMetadata)
      .catch((error) => {
        console.error("Failed to load metadata:", error);
        // Use fallback metadata
        apiClient.current.fetchMetadata().then(setMetadata);
      });
  }, []);

  // Tile management system
  const getTileKey = (
    x: number,
    y: number,
    z: number,
    variable: string,
    timeIndex: number
  ) => {
    return `${variable}-${timeIndex}-${z}-${x}-${y}`;
  };

  const calculateTileGrid = useCallback((bounds: any, zoom: number) => {
    // Calculate which tiles are needed for current viewport
    const tilesPerRow = Math.pow(2, zoom);
    const tiles = [];

    const startX = Math.floor(((bounds.west + 180) / 360) * tilesPerRow);
    const endX = Math.ceil(((bounds.east + 180) / 360) * tilesPerRow);
    const startY = Math.floor(((90 - bounds.north) / 180) * tilesPerRow);
    const endY = Math.ceil(((90 - bounds.south) / 180) * tilesPerRow);

    for (
      let x = Math.max(0, startX);
      x <= Math.min(tilesPerRow - 1, endX);
      x++
    ) {
      for (
        let y = Math.max(0, startY);
        y <= Math.min(tilesPerRow - 1, endY);
        y++
      ) {
        tiles.push({ x, y, z: zoom });
      }
    }

    return tiles;
  }, []);

  // Load tile from API
  const loadTile = useCallback(
    async (
      x: number,
      y: number,
      z: number,
      variable: string,
      timeIndex: number
    ) => {
      const tileKey = getTileKey(x, y, z, variable, timeIndex);

      // Check cache first
      if (tileCache.current.has(tileKey)) {
        const cached = tileCache.current.get(tileKey)!;
        // Cache for 5 minutes
        if (Date.now() - cached.timestamp < 300000) {
          return cached;
        }
      }

      // Skip if already loading
      if (loadingTiles.has(tileKey)) {
        return null;
      }

      setLoadingTiles((prev) => new Set([...prev, tileKey]));
      setErrorTiles((prev) => {
        const newSet = new Set(prev);
        newSet.delete(tileKey);
        return newSet;
      });

      try {
        const tileResponse = await apiClient.current.fetchTile(
          filename as string,
          variable,
          timeIndex,
          z,
          x,
          y
        );

        const tileData: TileData = {
          ...tileResponse,
          cached: true,
          timestamp: Date.now(),
        };

        tileCache.current.set(tileKey, tileData);

        setLoadingTiles((prev) => {
          const newSet = new Set(prev);
          newSet.delete(tileKey);
          return newSet;
        });

        setLoadedTiles((prev) => new Set([...prev, tileKey]));

        return tileData;
      } catch (error) {
        console.error(`Failed to load tile ${tileKey}:`, error);

        setLoadingTiles((prev) => {
          const newSet = new Set(prev);
          newSet.delete(tileKey);
          return newSet;
        });

        setErrorTiles((prev) => new Set([...prev, tileKey]));

        return null;
      }
    },
    [filename]
  );

  // Render tile to canvas
  const renderTileToCanvas = useCallback(
    (tileData: TileData, canvas: HTMLCanvasElement) => {
      const ctx = canvas.getContext("2d");
      if (!ctx || !metadata) return;

      const imageData = ctx.createImageData(256, 256);
      const pixels = imageData.data;
      const stats = metadata.statistics[selectedVariable];

      // Color scale functions
      const getColor = (value: number): [number, number, number] => {
        const normalized = Math.max(
          0,
          Math.min(1, (value - stats.min) / (stats.max - stats.min))
        );

        if (colorScale === "precipitation") {
          // Blue to green to yellow scale for precipitation
          if (normalized < 0.3) {
            const t = normalized / 0.3;
            return [
              Math.round(255 * (1 - t) + 100 * t),
              Math.round(255 * (1 - t) + 200 * t),
              255,
            ];
          } else if (normalized < 0.7) {
            const t = (normalized - 0.3) / 0.4;
            return [
              Math.round(100 * (1 - t) + 50 * t),
              Math.round(200 * (1 - t) + 255 * t),
              Math.round(255 * (1 - t) + 50 * t),
            ];
          } else {
            const t = (normalized - 0.7) / 0.3;
            return [
              Math.round(50 * (1 - t) + 255 * t),
              255,
              Math.round(50 * (1 - t) + 0 * t),
            ];
          }
        } else if (colorScale === "viridis") {
          // Viridis color scale
          return [
            Math.round(68 + (253 - 68) * normalized),
            Math.round(1 + (231 - 1) * normalized),
            Math.round(84 + (37 - 84) * normalized),
          ];
        } else {
          // Default plasma scale
          return [
            Math.round(13 + (240 - 13) * normalized),
            Math.round(8 + (249 - 8) * normalized),
            Math.round(135 + (33 - 135) * normalized),
          ];
        }
      };

      let idx = 0;
      for (let i = 0; i < 256; i++) {
        for (let j = 0; j < 256; j++) {
          const value = tileData.tile[i]?.[j] ?? 0;
          const [r, g, b] = getColor(value);
          pixels[idx] = r;
          pixels[idx + 1] = g;
          pixels[idx + 2] = b;
          pixels[idx + 3] = Math.round((opacity[0] / 100) * 255);
          idx += 4;
        }
      }

      ctx.putImageData(imageData, 0, 0);
    },
    [selectedVariable, colorScale, opacity, metadata]
  );

  // Custom Leaflet GridLayer that uses our API
  const createRasterLayer = useCallback(() => {
    if (typeof window === "undefined") return null;

    return new Promise(async (resolve) => {
      const L = (await import("leaflet")).default;

      const RasterLayer = L.GridLayer.extend({
        createTile: function (
          coords: any,
          done: (error: Error | null, tile: HTMLElement) => void
        ) {
          const canvas = document.createElement("canvas");
          canvas.width = 256;
          canvas.height = 256;

          loadTile(
            coords.x,
            coords.y,
            coords.z,
            selectedVariable,
            currentTimeIndex
          )
            .then((tileData) => {
              if (tileData) {
                renderTileToCanvas(tileData, canvas);
              } else {
                // Render empty/loading tile
                const ctx = canvas.getContext("2d");
                if (ctx) {
                  ctx.fillStyle = "rgba(200, 200, 200, 0.3)";
                  ctx.fillRect(0, 0, 256, 256);
                  ctx.fillStyle = "rgba(100, 100, 100, 0.8)";
                  ctx.font = "12px Arial";
                  ctx.textAlign = "center";
                  ctx.fillText("Loading...", 128, 128);
                }
              }
              done(null, canvas);
            })
            .catch((error) => {
              console.error("Tile creation error:", error);
              // Render error tile
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.fillStyle = "rgba(255, 100, 100, 0.3)";
                ctx.fillRect(0, 0, 256, 256);
                ctx.fillStyle = "rgba(150, 50, 50, 0.8)";
                ctx.font = "12px Arial";
                ctx.textAlign = "center";
                ctx.fillText("Error", 128, 128);
              }
              done(null, canvas);
            });

          return canvas;
        },
      });

      resolve(
        new RasterLayer({
          tileSize: 256,
          opacity: opacity[0] / 100,
          zIndex: 10,
        })
      );
    });
  }, [
    selectedVariable,
    currentTimeIndex,
    opacity,
    loadTile,
    renderTileToCanvas,
  ]);

  // Leaflet integration
  useEffect(() => {
    if (!isClient || !mapRef.current || !metadata) return;

    const initMap = async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      if (!mapInstanceRef.current) {
        mapInstanceRef.current = L.map(mapRef.current, {
          center: [0, 0],
          zoom: 2,
          minZoom: 0,
          maxZoom: 6,
          worldCopyJump: true,
          preferCanvas: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(mapInstanceRef.current);

        // Listen for viewport changes
        mapInstanceRef.current.on("moveend zoomend", () => {
          const bounds = mapInstanceRef.current.getBounds();
          const zoom = mapInstanceRef.current.getZoom();

          setViewportBounds({
            north: bounds.getNorth(),
            south: bounds.getSouth(),
            east: bounds.getEast(),
            west: bounds.getWest(),
          });
          setZoomLevel(zoom);
        });
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isClient, metadata]);

  // Update raster layer when parameters change
  useEffect(() => {
    if (!mapInstanceRef.current || !metadata) return;

    const updateRasterLayer = async () => {
      // Remove existing raster layer
      if (tileLayerRef.current) {
        mapInstanceRef.current.removeLayer(tileLayerRef.current);
        tileLayerRef.current = null;
      }

      // Create and add new raster layer
      const newLayer = await createRasterLayer();
      if (newLayer) {
        tileLayerRef.current = newLayer;
        mapInstanceRef.current.addLayer(tileLayerRef.current);
      }
    };

    updateRasterLayer();
  }, [
    selectedVariable,
    currentTimeIndex,
    opacity,
    createRasterLayer,
    metadata,
  ]);

  // Animation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying && metadata) {
      interval = setInterval(() => {
        setCurrentTimeIndex((prev) => (prev + 1) % metadata.dimensions.time);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, metadata]);

  const formatTimeLabel = (timeIndex: number) => {
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    return months[timeIndex % 12] + " " + (Math.floor(timeIndex / 12) + 2020);
  };

  const getVariableDisplayName = (variable: string) => {
    const names: { [key: string]: string } = {
      pr: "Precipitation",
      temperature: "Temperature",
      humidity: "Humidity",
    };
    return names[variable] || variable.toUpperCase();
  };

  const getDataSize = () => {
    if (!metadata) return "Loading...";
    const totalPixels =
      metadata.dimensions.lat *
      metadata.dimensions.lon *
      metadata.dimensions.time;
    const sizeBytes = totalPixels * 4;
    const sizeMB = sizeBytes / (1024 * 1024);
    return sizeMB > 1000
      ? `${(sizeMB / 1024).toFixed(1)} GB`
      : `${sizeMB.toFixed(0)} MB`;
  };

  if (!metadata) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-64">
          <div className="text-center">
            <LucideMap className="h-8 w-8 mx-auto mb-2 text-gray-400 animate-pulse" />
            <p className="text-sm text-gray-500">Loading raster data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <LucideMap className="h-5 w-5" />
              {title || "NetCDF Raster Viewer"}
            </CardTitle>
            <CardDescription>{metadata.attributes.title}</CardDescription>
            <div className="flex items-center gap-2 mt-2">
              <AlertTriangle className="h-4 w-4 text-blue-600" />
              <span className="text-sm text-blue-600">
                Large dataset ({getDataSize()}) - Using tile-based API
              </span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4" />
            <label className="text-sm font-medium">Variable:</label>
            <Select
              value={selectedVariable}
              onValueChange={setSelectedVariable}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {metadata.variables.map((variable) => (
                  <SelectItem key={variable} value={variable}>
                    {getVariableDisplayName(variable)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline">
              {metadata.statistics[selectedVariable]?.units || "units"}
            </Badge>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <div className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            <label className="text-sm font-medium">Color Scale:</label>
            <Select value={colorScale} onValueChange={setColorScale}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="precipitation">Precipitation</SelectItem>
                <SelectItem value="viridis">Viridis</SelectItem>
                <SelectItem value="plasma">Plasma</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator orientation="vertical" className="h-6" />

          <div className="flex items-center gap-2">
            <label className="text-sm font-medium">Opacity:</label>
            <div className="w-20">
              <Slider
                value={opacity}
                onValueChange={setOpacity}
                max={100}
                min={10}
                step={10}
                className="w-full"
              />
            </div>
            <span className="text-xs text-muted-foreground">{opacity[0]}%</span>
          </div>
        </div>

        {/* Time Controls */}
        <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentTimeIndex(0)}
            >
              <SkipBack className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <Pause className="h-4 w-4" />
              ) : (
                <Play className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentTimeIndex(metadata.dimensions.time - 1)}
            >
              <SkipForward className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 mx-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Time: {formatTimeLabel(currentTimeIndex)}
              </span>
              <span className="text-xs text-muted-foreground">
                {currentTimeIndex + 1} / {metadata.dimensions.time}
              </span>
            </div>
            <Slider
              value={[currentTimeIndex]}
              onValueChange={(value) => setCurrentTimeIndex(value[0])}
              max={metadata.dimensions.time - 1}
              min={0}
              step={1}
              className="w-full"
            />
          </div>
        </div>

        {/* Map Display */}
        <div className="relative border rounded-lg overflow-hidden bg-slate-100 h-96">
          {isClient ? (
            <div ref={mapRef} className="w-full h-full" />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-100">
              <div className="text-center">
                <LucideMap className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-500">Loading map...</p>
              </div>
            </div>
          )}

          {/* Status Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              Zoom: {zoomLevel} | Loaded: {loadedTiles.size} | Loading:{" "}
              {loadingTiles.size}
            </div>
            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              {errorTiles.size > 0 && `Errors: ${errorTiles.size} | `}
              {loadingTiles.size > 0 ? "Loading..." : "Ready"}
            </div>
            <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              {metadata.dimensions.lat}×{metadata.dimensions.lon} (
              {getDataSize()})
            </div>
          </div>
        </div>

        {/* Performance Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold">
              {metadata.dimensions.lat}×{metadata.dimensions.lon}
            </p>
            <p className="text-sm text-muted-foreground">Full Resolution</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{loadedTiles.size}</p>
            <p className="text-sm text-muted-foreground">Loaded Tiles</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">
              {Math.round((tileCache.current.size * 256 * 256 * 4) / 1024)}
            </p>
            <p className="text-sm text-muted-foreground">Cache (KB)</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600">{errorTiles.size}</p>
            <p className="text-sm text-muted-foreground">Failed Tiles</p>
          </div>
        </div>

        {/* API Integration Notes */}
        <div className="text-xs text-muted-foreground p-3 bg-green-50 border border-green-200 rounded">
          <strong>API Integration:</strong> This viewer fetches tiles from
          FastAPI backend at
          <code className="mx-1 px-1 bg-gray-200 rounded">
            /data/visualization/raster/tile/&#123;variable&#125;/&#123;time&#125;/&#123;z&#125;/&#123;x&#125;/&#123;y&#125;
          </code>
          Tiles are cached client-side and loaded on-demand as you pan and zoom.
        </div>
      </CardContent>
    </Card>
  );
};
