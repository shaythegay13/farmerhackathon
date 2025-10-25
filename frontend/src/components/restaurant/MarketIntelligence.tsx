import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle, 
  ArrowUpRight,
  ArrowDownRight,
  Brain,
  Search,
  BarChart3,
  Zap,
  Shield,
  Clock,
  Activity
} from 'lucide-react';
import { yieldlyApi } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface MarketTrend {
  ingredient: string;
  current_price_trend: string;
  price_forecast: string;
  forecast_percentage?: number;
  price_change_dollars?: {
    current_price_per_unit?: number;
    unit?: string;
    price_change_per_unit?: number;
    new_price_per_unit?: number;
    confidence?: string;
    reasoning?: string;
  };
  estimated_current_price?: number;
  estimated_price_change?: number;
  monthly_forecast_percentage?: number;
  monthly_price_change_dollars?: number;
  seasonal_factors?: string[];
  substitute_suggestions?: string[];
  risk_level?: string;
}

interface MenuAnalysis {
  menu_item_id: string;
  menu_item_name: string;
  current_food_cost: number;
  projected_food_cost: number;
  suggested_substitutions: Array<{
    original_ingredient: string;
    suggested_substitute: string;
    cost_savings: number;
    monthly_price_increase?: number;
    reason: string;
  }>;
  pricing_recommendation: {
    suggested_price: number;
    price_change: number;
    reason: string;
  };
  risk_level: string;
  optimization_score: number;
}

interface MarketIntelligenceProps {
  menuItems: any[];
  ingredients: any[];
}

export const MarketIntelligence: React.FC<MarketIntelligenceProps> = ({ 
  menuItems, 
  ingredients 
}) => {
  const [loading, setLoading] = useState(false);
  const [marketTrends, setMarketTrends] = useState<MarketTrend[]>([]);
  const [menuAnalyses, setMenuAnalyses] = useState<MenuAnalysis[]>([]);
  const [analysisTimestamp, setAnalysisTimestamp] = useState<string>('');
  const { toast } = useToast();

  const analyzeMarketTrends = async () => {
    if (!menuItems.length || !ingredients.length) {
      toast({
        title: "❌ Missing Data",
        description: "Please upload menu items and ingredients first",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const response = await yieldlyApi.analyzeMarketTrends(menuItems, ingredients);
      
      if (response.success && response.data) {
        const trends = response.data.market_trends || [];
        const analyses = response.data.menu_analyses || [];
        
        setMarketTrends(trends);
        setMenuAnalyses(analyses);
        setAnalysisTimestamp(response.data.analysis_timestamp || '');
        
        toast({
          title: "✅ Market Analysis Complete",
          description: `Analyzed ${trends.length} ingredients and ${analyses.length} menu items`,
        });
      } else {
        toast({
          title: "❌ Analysis Failed",
          description: response.error || "Failed to analyze market trends",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "❌ Error",
        description: "Failed to connect to analysis service",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend.toLowerCase()) {
      case 'increasing':
        return <TrendingUp className="h-4 w-4 text-red-500" />;
      case 'decreasing':
        return <TrendingDown className="h-4 w-4 text-green-500" />;
      case 'stable':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk.toLowerCase()) {
      case 'high':
        return <Badge variant="destructive">High Risk</Badge>;
      case 'medium':
        return <Badge variant="secondary">Medium Risk</Badge>;
      case 'low':
        return <Badge variant="outline">Low Risk</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getOptimizationColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  // Calculate summary statistics
  const totalPotentialSavings = menuAnalyses.reduce((sum, analysis) => {
    return sum + analysis.suggested_substitutions.reduce((subSum, sub) => subSum + sub.cost_savings, 0);
  }, 0);

  const avgOptimizationScore = menuAnalyses.length > 0
    ? Math.round(menuAnalyses.reduce((sum, a) => sum + a.optimization_score, 0) / menuAnalyses.length)
    : 0;

  const increasingTrends = marketTrends.filter(t => t.price_forecast === 'increasing').length;
  const stableTrends = marketTrends.filter(t => t.price_forecast === 'stable').length;
  const decreasingTrends = marketTrends.filter(t => t.price_forecast === 'decreasing').length;

  return (
    <div className="space-y-6">
      {/* Analysis Trigger */}
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-2xl">Market Intelligence</CardTitle>
                <CardDescription className="mt-1">
                  AI-powered market analysis using CPI forecasts and real-time research
                </CardDescription>
              </div>
            </div>
            <Button 
              onClick={analyzeMarketTrends} 
              disabled={loading || !menuItems.length || !ingredients.length}
              className="flex items-center gap-2"
              size="lg"
            >
              {loading ? (
                <>
                  <Activity className="h-4 w-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  Analyze Market Trends
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {analysisTimestamp && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Clock className="h-4 w-4" />
              <span>Last updated: {new Date(analysisTimestamp).toLocaleString()}</span>
            </div>
          )}
          
          {(!menuItems.length || !ingredients.length) && (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Please upload menu items and ingredients to enable market analysis.
              </AlertDescription>
            </Alert>
          )}

          {/* Summary Stats */}
          {marketTrends.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Increasing</span>
                </div>
                <p className="text-2xl font-bold text-blue-600">{increasingTrends}</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-900">Stable</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{stableTrends}</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-900">Decreasing</span>
                </div>
                <p className="text-2xl font-bold text-purple-600">{decreasingTrends}</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results */}
      {(marketTrends.length > 0 || menuAnalyses.length > 0) && (
        <Tabs defaultValue="trends" className="space-y-4">
          <TabsList>
            <TabsTrigger value="trends">Market Trends</TabsTrigger>
            <TabsTrigger value="menu">Menu Analysis</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          {/* Market Trends Tab */}
          <TabsContent value="trends" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              {marketTrends.map((trend, index) => (
                <Card key={index} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2 rounded-lg ${
                            trend.price_forecast === 'increasing' ? 'bg-red-100' :
                            trend.price_forecast === 'decreasing' ? 'bg-green-100' :
                            'bg-blue-100'
                          }`}>
                            {getTrendIcon(trend.price_forecast)}
                          </div>
                          <div className="flex-1">
                            <h3 className="font-semibold text-lg">{trend.ingredient}</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                              Current trend: <span className="capitalize">{trend.current_price_trend}</span>
                            </p>
                          </div>
                        </div>
                        
                        {trend.monthly_price_change_dollars !== undefined ? (
                          <Badge 
                            variant={trend.price_forecast === 'increasing' ? 'destructive' : 
                                    trend.price_forecast === 'decreasing' ? 'default' : 'secondary'}
                            className="text-lg font-bold px-3 py-1"
                          >
                            {trend.monthly_price_change_dollars > 0 ? '+' : ''}
                            ${Math.abs(trend.monthly_price_change_dollars).toFixed(2)}
                            {trend.price_change_dollars?.unit ? ` ${trend.price_change_dollars.unit}/mo` : '/mo'}
                          </Badge>
                        ) : trend.price_change_dollars?.price_change_per_unit !== undefined ? (
                          <Badge 
                            variant={trend.price_forecast === 'increasing' ? 'destructive' : 
                                    trend.price_forecast === 'decreasing' ? 'default' : 'secondary'}
                            className="text-lg font-bold px-3 py-1"
                          >
                            {trend.price_change_dollars.price_change_per_unit > 0 ? '+' : ''}
                            ${Math.abs(trend.price_change_dollars.price_change_per_unit).toFixed(2)}
                            {trend.price_change_dollars.unit ? ` ${trend.price_change_dollars.unit}` : ''}
                          </Badge>
                        ) : trend.monthly_forecast_percentage ? (
                          <Badge 
                            variant={trend.price_forecast === 'increasing' ? 'destructive' : 
                                    trend.price_forecast === 'decreasing' ? 'default' : 'secondary'}
                            className="text-lg font-bold px-3 py-1"
                          >
                            {trend.monthly_forecast_percentage > 0 ? '+' : ''}{trend.monthly_forecast_percentage.toFixed(2)}%/mo
                          </Badge>
                        ) : trend.forecast_percentage ? (
                          <Badge 
                            variant={trend.price_forecast === 'increasing' ? 'destructive' : 
                                    trend.price_forecast === 'decreasing' ? 'default' : 'secondary'}
                            className="text-lg font-bold px-3 py-1"
                          >
                            {trend.forecast_percentage > 0 ? '+' : ''}{trend.forecast_percentage.toFixed(1)}%/yr
                          </Badge>
                        ) : null}
                      </div>

                      {/* Price Details */}
                      {trend.price_change_dollars && (
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-xs text-muted-foreground mb-1">Current Price</p>
                            <p className="text-lg font-bold">
                              ${trend.price_change_dollars.current_price_per_unit?.toFixed(2) || 'N/A'}
                              {trend.price_change_dollars.unit && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  {trend.price_change_dollars.unit}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className={`p-3 rounded-lg ${
                            trend.price_forecast === 'increasing' ? 'bg-red-50 border-2 border-red-200' :
                            trend.price_forecast === 'decreasing' ? 'bg-green-50 border-2 border-green-200' :
                            'bg-muted'
                          }`}>
                            <p className="text-xs text-muted-foreground mb-1">New Price</p>
                            <p className="text-lg font-bold">
                              ${trend.price_change_dollars.new_price_per_unit?.toFixed(2) || 'N/A'}
                              {trend.price_change_dollars.unit && (
                                <span className="text-xs text-muted-foreground ml-1">
                                  {trend.price_change_dollars.unit}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Forecast Bar */}
                      {trend.forecast_percentage && (
                        <div>
                          <div className="flex items-center justify-between text-xs mb-1">
                            <span className="text-muted-foreground">Price Change Forecast</span>
                            <span className="font-medium">{trend.price_forecast}</span>
                          </div>
                          <Progress 
                            value={Math.abs(trend.forecast_percentage) * 10} 
                            className={`h-2 ${
                              trend.price_forecast === 'increasing' ? 'bg-red-200' :
                              trend.price_forecast === 'decreasing' ? 'bg-green-200' :
                              'bg-blue-200'
                            }`}
                          />
                        </div>
                      )}
                      
                      {/* Seasonal Factors */}
                      {trend.seasonal_factors && trend.seasonal_factors.length > 0 && (
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-2">Seasonal Factors:</p>
                          <div className="flex flex-wrap gap-1">
                            {trend.seasonal_factors.slice(0, 3).map((factor, i) => (
                              <Badge key={i} variant="outline" className="text-xs">
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {/* Substitutes */}
                      {trend.substitute_suggestions && trend.substitute_suggestions.length > 0 && (
                        <div className="pt-2 border-t">
                          <p className="text-xs font-medium text-muted-foreground mb-2">Suggested Substitutes:</p>
                          <div className="flex flex-wrap gap-1">
                            {trend.substitute_suggestions.slice(0, 3).map((sub, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {sub}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Menu Analysis Tab */}
          <TabsContent value="menu" className="space-y-4">
            {/* Summary Card */}
            {menuAnalyses.length > 0 && (
              <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-2">
                <CardContent className="pt-6">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <BarChart3 className="h-5 w-5 text-blue-600" />
                        <span className="text-sm font-medium text-muted-foreground">Avg Score</span>
                      </div>
                      <p className="text-3xl font-bold text-blue-600">{avgOptimizationScore}/100</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <DollarSign className="h-5 w-5 text-green-600" />
                        <span className="text-sm font-medium text-muted-foreground">Potential Savings</span>
                      </div>
                      <p className="text-3xl font-bold text-green-600">${totalPotentialSavings.toFixed(2)}</p>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        <Shield className="h-5 w-5 text-purple-600" />
                        <span className="text-sm font-medium text-muted-foreground">Menu Items</span>
                      </div>
                      <p className="text-3xl font-bold text-purple-600">{menuAnalyses.length}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="grid gap-4">
              {menuAnalyses.map((analysis, index) => {
                const costChange = analysis.projected_food_cost - analysis.current_food_cost;
                const costChangePercent = analysis.current_food_cost > 0 
                  ? (costChange / analysis.current_food_cost) * 100 
                  : 0;

                return (
                  <Card key={index} className="hover:shadow-lg transition-shadow">
                    <CardContent className="pt-6">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-xl">{analysis.menu_item_name}</h3>
                              {getRiskBadge(analysis.risk_level)}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              Food cost analysis and pricing optimization
                            </p>
                          </div>
                          
                          <div className="text-right">
                            <div className={`text-2xl font-bold ${getOptimizationColor(analysis.optimization_score)}`}>
                              {analysis.optimization_score}
                            </div>
                            <p className="text-xs text-muted-foreground">Score</p>
                          </div>
                        </div>

                        <Separator />

                        {/* Cost Comparison */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-muted rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
                              <p className="text-sm font-medium text-muted-foreground">Current Cost</p>
                            </div>
                            <p className="text-2xl font-bold">${analysis.current_food_cost.toFixed(2)}</p>
                          </div>
                          <div className={`p-4 rounded-lg ${
                            costChange > 0 ? 'bg-red-50 border-2 border-red-200' :
                            costChange < 0 ? 'bg-green-50 border-2 border-green-200' :
                            'bg-muted'
                          }`}>
                            <div className="flex items-center gap-2 mb-2">
                              <div className={`h-2 w-2 rounded-full ${
                                costChange > 0 ? 'bg-red-500' :
                                costChange < 0 ? 'bg-green-500' :
                                'bg-blue-500'
                              }`}></div>
                              <p className="text-sm font-medium text-muted-foreground">Projected Cost</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <p className="text-2xl font-bold">${analysis.projected_food_cost.toFixed(2)}</p>
                              {costChange !== 0 && (
                                <div className="flex flex-col gap-1">
                                  <Badge variant={costChange > 0 ? 'destructive' : 'default'} className="text-xs">
                                    {costChange > 0 ? '+' : ''}{costChangePercent.toFixed(1)}%
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    +${(costChange / 12).toFixed(2)}/mo
                                  </Badge>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Optimization Score */}
                        <div>
                          <div className="flex items-center justify-between text-sm mb-2">
                            <span className="font-medium">Optimization Score</span>
                            <span className={getOptimizationColor(analysis.optimization_score)}>
                              {analysis.optimization_score}/100
                            </span>
                          </div>
                          <Progress 
                            value={analysis.optimization_score} 
                            className={`h-3 ${
                              analysis.optimization_score >= 80 ? 'bg-green-200' :
                              analysis.optimization_score >= 60 ? 'bg-yellow-200' :
                              'bg-red-200'
                            }`}
                          />
                        </div>

                        {/* Pricing Recommendation */}
                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-4 rounded-lg border-2">
                          <div className="flex items-center gap-2 mb-3">
                            <Zap className="h-5 w-5 text-primary" />
                            <span className="font-semibold">Pricing Recommendation</span>
                          </div>
                          <div className="flex items-center gap-3 mb-2">
                            <span className="text-3xl font-bold">
                              ${analysis.pricing_recommendation.suggested_price.toFixed(2)}
                            </span>
                            {analysis.pricing_recommendation.price_change !== 0 && (
                              <Badge 
                                variant={analysis.pricing_recommendation.price_change > 0 ? 'destructive' : 'default'}
                                className="text-base px-3 py-1 flex items-center gap-1"
                              >
                                {analysis.pricing_recommendation.price_change > 0 ? (
                                  <ArrowUpRight className="h-4 w-4" />
                                ) : (
                                  <ArrowDownRight className="h-4 w-4" />
                                )}
                                {analysis.pricing_recommendation.price_change > 0 ? '+' : ''}
                                ${Math.abs(analysis.pricing_recommendation.price_change).toFixed(2)}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {analysis.pricing_recommendation.reason}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Recommendations Tab */}
          <TabsContent value="recommendations" className="space-y-4">
            {menuAnalyses.filter(analysis => analysis.suggested_substitutions.length > 0).length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center py-12">
                  <Zap className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-semibold text-lg mb-2">No Substitutions Available</h3>
                  <p className="text-sm text-muted-foreground">
                    All menu items are already optimized based on current market trends.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Total Savings Summary */}
                <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Total Potential Savings</p>
                        <p className="text-4xl font-bold text-green-600">
                          ${totalPotentialSavings.toFixed(2)}
                        </p>
                      </div>
                      <div className="p-4 bg-green-100 rounded-full">
                        <DollarSign className="h-8 w-8 text-green-600" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <div className="grid gap-4">
                  {menuAnalyses
                    .filter(analysis => analysis.suggested_substitutions.length > 0)
                    .map((analysis, index) => {
                      const itemSavings = analysis.suggested_substitutions.reduce((sum, sub) => sum + sub.cost_savings, 0);
                      
                      return (
                        <Card key={index} className="hover:shadow-lg transition-shadow">
                          <CardContent className="pt-6">
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="font-semibold text-xl">{analysis.menu_item_name}</h3>
                              <Badge variant="default" className="text-base px-3 py-1">
                                Save ${itemSavings.toFixed(2)}
                              </Badge>
                            </div>
                            
                            <Separator className="mb-4" />
                            
                            <div className="space-y-3">
                              {analysis.suggested_substitutions.map((sub, subIndex) => (
                                <div 
                                  key={subIndex} 
                                  className="flex items-start justify-between p-4 bg-muted rounded-lg hover:bg-muted/80 transition-colors"
                                >
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <div className="h-2 w-2 rounded-full bg-primary"></div>
                                      <div className="font-medium flex items-center gap-2">
                                        <span className="text-muted-foreground line-through">{sub.original_ingredient}</span>
                                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-primary">{sub.suggested_substitute}</span>
                                      </div>
                                    </div>
                                    <div className="ml-4 space-y-1">
                                      <p className="text-sm text-muted-foreground">
                                        {sub.reason}
                                      </p>
                                      {sub.monthly_price_increase !== undefined && (
                                        <p className="text-xs font-medium text-red-600">
                                          Monthly increase: +${sub.monthly_price_increase.toFixed(2)} for required quantity
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-2">
                                    {sub.monthly_price_increase !== undefined && (
                                      <Badge variant="destructive" className="text-xs px-2 py-1">
                                        +${sub.monthly_price_increase.toFixed(2)}/mo
                                      </Badge>
                                    )}
                                    <Badge variant="secondary" className="text-base px-3 py-1">
                                      Save ${sub.cost_savings.toFixed(2)}
                                    </Badge>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};
