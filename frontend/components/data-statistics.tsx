"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle } from "lucide-react"

interface DataStatistics {
  [column: string]: {
    type: string
    count: number
    nullCount: number
    nullPercentage: number
    min?: number
    max?: number
    mean?: number
    median?: number
    uniqueCount?: number
    mostCommon?: string
  }
}

interface DataStatisticsProps {
  statistics: DataStatistics
  totalRows: number
  issues: any[]
}

export function DataStatistics({ statistics, totalRows, issues }: DataStatisticsProps) {
  const columns = Object.keys(statistics)
  const numericColumns = columns.filter((col) => statistics[col].type === "number")
  const textColumns = columns.filter((col) => statistics[col].type === "text")
  const dateColumns = columns.filter((col) => statistics[col].type === "date")

  const overallDataQuality = () => {
    const totalCells = totalRows * columns.length
    const totalNulls = columns.reduce((sum, col) => sum + statistics[col].nullCount, 0)
    return Math.round(((totalCells - totalNulls) / totalCells) * 100)
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case "number":
        return "bg-blue-100 text-blue-800"
      case "text":
        return "bg-green-100 text-green-800"
      case "date":
        return "bg-purple-100 text-purple-800"
      case "boolean":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Total Rows</span>
            </div>
            <p className="text-2xl font-bold mt-2">{totalRows.toLocaleString()}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Columns</span>
            </div>
            <p className="text-2xl font-bold mt-2">{columns.length}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span className="text-sm font-medium">Data Quality</span>
            </div>
            <p className="text-2xl font-bold mt-2">{overallDataQuality()}%</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <span className="text-sm font-medium">Issues Found</span>
            </div>
            <p className="text-2xl font-bold mt-2">{issues.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Column Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Column Statistics</CardTitle>
          <CardDescription>Detailed statistics for each column in your dataset</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {columns.map((column) => {
              const stats = statistics[column]
              return (
                <div key={column} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{column}</h4>
                      <Badge className={getTypeColor(stats.type)}>{stats.type}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{stats.count.toLocaleString()} values</div>
                  </div>

                  {/* Completeness */}
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Completeness</span>
                      <span>{Math.round((stats.count / totalRows) * 100 * 100) / 100}%</span>
                    </div>
                    <Progress value={(stats.count / totalRows) * 100} className="h-2" />
                  </div>

                  {/* Type-specific statistics */}
                  {stats.type === "number" && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Min:</span>
                        <p className="font-medium">{stats.min}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Max:</span>
                        <p className="font-medium">{stats.max}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Mean:</span>
                        <p className="font-medium">{stats.mean}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Median:</span>
                        <p className="font-medium">{stats.median}</p>
                      </div>
                    </div>
                  )}

                  {stats.type === "text" && (
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Unique Values:</span>
                        <p className="font-medium">{stats.uniqueCount}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Most Common:</span>
                        <p className="font-medium truncate">{stats.mostCommon}</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
