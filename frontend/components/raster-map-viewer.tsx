"use client";

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

export function RasterMapViewer({
  data,
  title = "Climate Data Visualization",
  description,
}: RasterMapViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedVariable, setSelectedVariable] = useState<string>(
    data.variables[0] || ""
  );
  const [currentTimeIndex, setCurrentTimeIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [colorScale, setColorScale] = useState("viridis");
  const [opacity, setOpacity] = useState([80]);
  const [showLegend, setShowLegend] = useState(true);

  // Generate realistic precipitation data based on the NetCDF structure
  const generateRealisticData = useCallback(
    (variable: string, timeIndex: number) => {
      const { lat: latCount, lon: lonCount } = data.dimensions;
      const mockData: number[][] = [];

      // Use the sample layer statistics for realistic ranges
      const layer1 = data.sample_layers.layer1;
      const layer2 = data.sample_layers.layer2;
      const minVal = Math.min(layer1.min, layer2.min);
      const maxVal = Math.max(layer1.max, layer2.max);
      const meanVal = (layer1.mean + layer2.mean) / 2;

      // Create smaller grid for performance (downsample)
      const sampleLat = Math.min(200, latCount);
      const sampleLon = Math.min(400, lonCount);

      for (let lat = 0; lat < sampleLat; lat++) {
        const row: number[] = [];
        for (let lon = 0; lon < sampleLon; lon++) {
          let value = 0;

          if (variable === "pr") {
            // Generate precipitation patterns similar to the sample data
            const latNorm = lat / sampleLat;
            const lonNorm = lon / sampleLon;
            const timeNorm = timeIndex / data.dimensions.time;

            // Create realistic precipitation patterns
            const seasonalPattern =
              Math.sin(timeNorm * 2 * Math.PI) * 0.3 + 0.7;
            const latitudePattern = Math.sin(latNorm * Math.PI) * 0.5 + 0.5;
            const longitudePattern =
              Math.sin(lonNorm * 4 * Math.PI) * 0.2 + 0.8;

            // Base pattern
            value =
              meanVal * seasonalPattern * latitudePattern * longitudePattern;

            // Add some realistic noise and coastal effects
            const noise = (Math.random() - 0.5) * meanVal * 0.5;
            const coastalEffect =
              Math.sin(lonNorm * 2 * Math.PI) * meanVal * 0.3;

            value = Math.max(
              minVal,
              Math.min(maxVal, value + noise + coastalEffect)
            );
          }

          row.push(value);
        }
        mockData.push(row);
      }

      return mockData;
    },
    [data.dimensions, data.sample_layers]
  );

  // Color scale functions
  const getColorScales = () => ({
    viridis: [
      [0, [68, 1, 84]],
      [0.25, [59, 82, 139]],
      [0.5, [33, 145, 140]],
      [0.75, [94, 201, 98]],
      [1, [253, 231, 37]],
    ],
    plasma: [
      [0, [13, 8, 135]],
      [0.25, [126, 3, 168]],
      [0.5, [203, 70, 121]],
      [0.75, [248, 149, 64]],
      [1, [240, 249, 33]],
    ],
    blues: [
      [0, [247, 251, 255]],
      [0.25, [198, 219, 239]],
      [0.5, [107, 174, 214]],
      [0.75, [49, 130, 189]],
      [1, [8, 81, 156]],
    ],
    precipitation: [
      [0, [255, 255, 255]],
      [0.2, [199, 233, 180]],
      [0.4, [127, 205, 187]],
      [0.6, [65, 182, 196]],
      [0.8, [29, 145, 192]],
      [1, [34, 94, 168]],
    ],
  });

  const interpolateColor = (
    value: number,
    min: number,
    max: number,
    colorScale: string
  ) => {
    const scales = getColorScales();
    const scale = scales[colorScale as keyof typeof scales] || scales.viridis;

    const normalized = Math.max(0, Math.min(1, (value - min) / (max - min)));

    // Find the two colors to interpolate between
    let lowerIndex = 0;
    let upperIndex = scale.length - 1;

    for (let i = 0; i < scale.length - 1; i++) {
      if (normalized >= scale[i][0] && normalized <= scale[i + 1][0]) {
        lowerIndex = i;
        upperIndex = i + 1;
        break;
      }
    }

    const lower = scale[lowerIndex];
    const upper = scale[upperIndex];
    const t =
      upperIndex === lowerIndex
        ? 0
        : (normalized - lower[0]) / (upper[0] - lower[0]);

    const r = Math.round(lower[1][0] + (upper[1][0] - lower[1][0]) * t);
    const g = Math.round(lower[1][1] + (upper[1][1] - lower[1][1]) * t);
    const b = Math.round(lower[1][2] + (upper[1][2] - lower[1][2]) * t);

    return [r, g, b];
  };

  // Render the raster data on canvas
  const renderRasterData = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const mockData = generateRealisticData(selectedVariable, currentTimeIndex);
    const latCount = mockData.length;
    const lonCount = mockData[0].length;

    // Calculate min/max values for color scaling
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;

    mockData.forEach((row) => {
      row.forEach((value) => {
        min = Math.min(min, value);
        max = Math.max(max, value);
      });
    });

    // Set canvas size
    const pixelSize = 3; // Larger pixels for better visibility
    canvas.width = lonCount * pixelSize;
    canvas.height = latCount * pixelSize;

    // Create image data
    const imageData = ctx.createImageData(canvas.width, canvas.height);
    const pixels = imageData.data;

    for (let lat = 0; lat < latCount; lat++) {
      for (let lon = 0; lon < lonCount; lon++) {
        const value = mockData[lat][lon];
        const [r, g, b] = interpolateColor(value, min, max, colorScale);

        // Each data point maps to a pixelSize x pixelSize area
        for (let dy = 0; dy < pixelSize; dy++) {
          for (let dx = 0; dx < pixelSize; dx++) {
            const pixelIndex =
              ((lat * pixelSize + dy) * canvas.width + (lon * pixelSize + dx)) *
              4;
            pixels[pixelIndex] = r; // Red
            pixels[pixelIndex + 1] = g; // Green
            pixels[pixelIndex + 2] = b; // Blue
            pixels[pixelIndex + 3] = Math.round(opacity[0] * 2.55); // Alpha
          }
        }
      }
    }

    ctx.putImageData(imageData, 0, 0);
  }, [
    selectedVariable,
    currentTimeIndex,
    colorScale,
    opacity,
    generateRealisticData,
  ]);

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

  // Re-render when parameters change
  useEffect(() => {
    renderRasterData();
  }, [renderRasterData]);

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
        <div className="relative border rounded-lg overflow-hidden bg-slate-100">
          <canvas
            ref={canvasRef}
            className="w-full h-96 object-contain"
            style={{ imageRendering: "pixelated" }}
          />

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
                  {data.sample_layers.layer1.min.toExponential(2)}
                </span>
                <div
                  className="w-32 h-4 rounded"
                  style={{
                    background:
                      colorScale === "precipitation"
                        ? `linear-gradient(to right, rgb(255,255,255), rgb(199,233,180), rgb(127,205,187), rgb(65,182,196), rgb(29,145,192), rgb(34,94,168))`
                        : `linear-gradient(to right, rgb(68,1,84), rgb(59,82,139), rgb(33,145,140), rgb(94,201,98), rgb(253,231,37))`,
                  }}
                />
                <span className="text-xs text-muted-foreground">
                  {data.sample_layers.layer1.max.toExponential(2)}
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
}
