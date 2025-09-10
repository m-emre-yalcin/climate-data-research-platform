import { useState, useEffect, useRef } from "react";
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
  Map,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Layers,
  Palette,
  Download,
  Maximize2,
} from "lucide-react";

interface NetCDFRasterData {
  dimensions: {
    time: number;
    lat: number;
    lon: number;
  };
  variables: string[];
  coordinates: string[];
  attributes: {
    title: string;
    institution?: string;
    project?: string;
    summary?: string;
    caution?: string;
    comment?: string;
  };
  shape: {
    [variable: string]: number[];
  };
  sample_layers: {
    layer1: {
      data: string | number[][];
      shape: number[];
      min: number;
      max: number;
      mean: number;
    };
    layer2: {
      data: string | number[][];
      shape: number[];
      min: number;
      max: number;
      mean: number;
    };
  };
}

interface RasterMapViewerProps {
  data: NetCDFRasterData;
  title?: string;
  description?: string;
}

// Mock data for demonstration
const mockData: NetCDFRasterData = {
  dimensions: { time: 24, lat: 180, lon: 360 },
  variables: ["pr", "temperature", "humidity"],
  coordinates: ["time", "lat", "lon"],
  attributes: {
    title: "Climate Model Output - Precipitation and Temperature Data",
    institution: "Climate Research Institute",
    comment: "This is a demonstration with mock data",
  },
  shape: {
    pr: [24, 180, 360],
    temperature: [24, 180, 360],
    humidity: [24, 180, 360],
  },
  sample_layers: {
    layer1: {
      data: "base64encodeddata",
      shape: [180, 360],
      min: 0.0001,
      max: 0.05,
      mean: 0.0025,
    },
    layer2: {
      data: "base64encodeddata",
      shape: [180, 360],
      min: -10.5,
      max: 35.2,
      mean: 15.8,
    },
  },
};

// Leaflet Map Component (Client-side only)
function LeafletMapComponent({
  selectedVariable,
  currentTimeIndex,
  colorScale,
  opacity,
  minVal,
  maxVal,
}: {
  selectedVariable: string;
  currentTimeIndex: number;
  colorScale: string;
  opacity: number;
  minVal: number;
  maxVal: number;
}) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const layerRef = useRef<any>(null);

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined" || !mapRef.current) return;

    // Dynamically import Leaflet
    const initMap = async () => {
      const L = (await import("leaflet")).default;
      await import("leaflet/dist/leaflet.css");

      // Fix default marker icons
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      if (!mapInstanceRef.current && mapRef.current) {
        mapInstanceRef.current = L.map(mapRef.current, {
          center: [0, 0],
          zoom: 2,
          minZoom: 1,
          maxZoom: 8,
          worldCopyJump: true,
          preferCanvas: true,
        });

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(mapInstanceRef.current);
      }
    };

    initMap();

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update raster layer when parameters change
  useEffect(() => {
    if (!mapInstanceRef.current || typeof window === "undefined") return;

    const updateRasterLayer = async () => {
      const L = (await import("leaflet")).default;

      // Remove existing layer
      if (layerRef.current) {
        mapInstanceRef.current.removeLayer(layerRef.current);
      }

      // Create mock raster overlay (replace with actual tile fetching)
      const bounds = [
        [-85, -180],
        [85, 180],
      ] as [[number, number], [number, number]];

      // Create a simple colored rectangle as demonstration
      const getColor = () => {
        const colors = {
          viridis: "#440154",
          plasma: "#0d0887",
          blues: "#08519c",
          precipitation: "#1f78b4",
        };
        return colors[colorScale as keyof typeof colors] || colors.viridis;
      };

      layerRef.current = L.rectangle(bounds, {
        color: getColor(),
        weight: 0,
        fillOpacity: opacity / 100,
        fillColor: getColor(),
      }).addTo(mapInstanceRef.current);

      // Add info popup
      layerRef.current.bindPopup(`
        <b>${selectedVariable.toUpperCase()}</b><br>
        Time Step: ${currentTimeIndex + 1}<br>
        Color Scale: ${colorScale}<br>
        Opacity: ${opacity}%
      `);
    };

    updateRasterLayer();
  }, [selectedVariable, currentTimeIndex, colorScale, opacity, minVal, maxVal]);

  return <div ref={mapRef} className="w-full h-full" />;
}

export const RasterMapViewer = ({
  data = mockData,
  title = "Climate Data Visualization",
  description,
}: RasterMapViewerProps) => {
  const [selectedVariable, setSelectedVariable] = useState<string>(
    data.variables[0] || ""
  );
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [colorScale, setColorScale] = useState("viridis");
  const [opacity, setOpacity] = useState([80]);
  const [showLegend, setShowLegend] = useState(true);
  const [isClient, setIsClient] = useState(false);

  // Ensure client-side rendering for map
  useEffect(() => {
    setIsClient(true);
  }, []);

  const minVal = Math.min(
    data.sample_layers.layer1.min,
    data.sample_layers.layer2.min
  );
  const maxVal = Math.max(
    data.sample_layers.layer1.max,
    data.sample_layers.layer2.max
  );

  // Animation controls
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTimeIndex((prev) => (prev + 1) % data.dimensions.time);
      }, 500);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, data.dimensions.time]);

  const getVariableDisplayName = (variable: string) => {
    const names: { [key: string]: string } = {
      pr: "Precipitation",
      temperature: "Temperature",
      humidity: "Humidity",
      wind_speed: "Wind Speed",
    };
    return names[variable] || variable.toUpperCase();
  };

  const getVariableUnit = (variable: string) => {
    const units: { [key: string]: string } = {
      pr: "kg m⁻² s⁻¹",
      temperature: "°C",
      humidity: "%",
      wind_speed: "m/s",
    };
    return units[variable] || "units";
  };

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
    return (
      months[timeIndex % 12] +
      (timeIndex < 12 ? " Y1" : " Y" + Math.floor(timeIndex / 12 + 1))
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Map className="h-5 w-5" />
              {title}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
            <CardDescription className="mt-2">
              {data.attributes.title}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Maximize2 className="h-4 w-4 mr-2" />
              Fullscreen
            </Button>
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
                {data.variables.map((variable) => (
                  <SelectItem key={variable} value={variable}>
                    {getVariableDisplayName(variable)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Badge variant="outline">{getVariableUnit(selectedVariable)}</Badge>
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
                <SelectItem value="blues">Blues</SelectItem>
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
              onClick={() => setCurrentTimeIndex(data.dimensions.time - 1)}
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
                {currentTimeIndex + 1} / {data.dimensions.time}
              </span>
            </div>
            <Slider
              value={[currentTimeIndex]}
              onValueChange={(value) => setCurrentTimeIndex(value[0])}
              max={data.dimensions.time - 1}
              min={0}
              step={1}
              className="w-full"
            />
          </div>
        </div>

        {/* Map Display */}
        <div className="relative border rounded-lg overflow-hidden bg-slate-100 h-96">
          {isClient ? (
            <LeafletMapComponent
              selectedVariable={selectedVariable}
              currentTimeIndex={currentTimeIndex}
              colorScale={colorScale}
              opacity={opacity[0]}
              minVal={minVal}
              maxVal={maxVal}
            />
          ) : (
            <div className="flex items-center justify-center h-full bg-gray-100">
              <div className="text-center">
                <Map className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                <p className="text-sm text-gray-500">Loading map...</p>
              </div>
            </div>
          )}

          {/* Info Overlay */}
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              Global Coverage
            </div>
            <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
              {data.sample_layers.layer1.shape[0]}×
              {data.sample_layers.layer1.shape[1]} grid
            </div>
          </div>
        </div>

        {/* Legend */}
        {showLegend && (
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium">
                {getVariableDisplayName(selectedVariable)}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">
                  {minVal.toExponential(2)}
                </span>
                <div
                  className="w-32 h-4 rounded"
                  style={{
                    background:
                      colorScale === "precipitation"
                        ? `linear-gradient(to right, rgb(255,255,255), rgb(199,233,180), rgb(127,205,187), rgb(65,182,196), rgb(29,145,192), rgb(34,94,168))`
                        : colorScale === "blues"
                        ? `linear-gradient(to right, rgb(247,251,255), rgb(198,219,239), rgb(107,174,214), rgb(49,130,189), rgb(8,81,156))`
                        : colorScale === "plasma"
                        ? `linear-gradient(to right, rgb(13,8,135), rgb(126,3,168), rgb(203,70,121), rgb(248,149,64), rgb(240,249,33))`
                        : `linear-gradient(to right, rgb(68,1,84), rgb(59,82,139), rgb(33,145,140), rgb(94,201,98), rgb(253,231,37))`,
                  }}
                />
                <span className="text-xs text-muted-foreground">
                  {maxVal.toExponential(2)}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {getVariableUnit(selectedVariable)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowLegend(false)}
            >
              Hide Legend
            </Button>
          </div>
        )}

        {/* Data Info */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t">
          <div className="text-center">
            <p className="text-2xl font-bold">
              {data.dimensions.lat}×{data.dimensions.lon}
            </p>
            <p className="text-sm text-muted-foreground">Full Grid Size</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{data.dimensions.time}</p>
            <p className="text-sm text-muted-foreground">Time Steps</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{data.variables.length}</p>
            <p className="text-sm text-muted-foreground">Variables</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">
              {(data.sample_layers.layer1.mean * 86400).toFixed(2)}
            </p>
            <p className="text-sm text-muted-foreground">Daily Mean (mm)</p>
          </div>
        </div>

        {/* NetCDF Info */}
        {data.attributes.comment && (
          <div className="text-xs text-muted-foreground p-3 bg-muted/30 rounded">
            <strong>Note:</strong> {data.attributes.comment}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RasterMapViewer;
