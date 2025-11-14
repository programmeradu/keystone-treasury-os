'use client';

import { useState } from 'react';
import { STRATEGY_TEMPLATES, getTemplatesByCategory, type StrategyTemplate } from '@/lib/strategy-templates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface StrategyTemplatesProps {
  onTemplateSelect: (template: StrategyTemplate, inputs: Record<string, any>) => void;
  isLoading?: boolean;
}

/**
 * Strategy Templates Component
 * Displays pre-configured templates for quick agent execution
 */
export function StrategyTemplates({ onTemplateSelect, isLoading = false }: StrategyTemplatesProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<StrategyTemplate | null>(null);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [activeTab, setActiveTab] = useState<string>('all');

  const categories = getTemplatesByCategory();

  const handleTemplateClick = (template: StrategyTemplate) => {
    setSelectedTemplate(template);
    // Initialize form with default values
    const initialValues: Record<string, any> = {};
    template.formFields.forEach(field => {
      initialValues[field.name] = field.default ?? '';
    });
    setFormValues(initialValues);
  };

  const handleInputChange = (name: string, value: any) => {
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  const handleExecute = () => {
    if (!selectedTemplate) return;
    
    // Merge form values with default input
    const finalInput = {
      ...selectedTemplate.defaultInput,
      ...formValues,
    };
    
    onTemplateSelect(selectedTemplate, finalInput);
  };

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'bg-green-500/20 text-green-400 border-green-500';
      case 'medium':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500';
      case 'high':
        return 'bg-red-500/20 text-red-400 border-red-500';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500';
    }
  };

  // Show template detail view
  if (selectedTemplate) {
    return (
      <Card className="w-full bg-slate-800 border-slate-700">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl text-white">
                {selectedTemplate.icon} {selectedTemplate.name}
              </CardTitle>
              <CardDescription className="text-slate-400 mt-2">
                {selectedTemplate.description}
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className={getRiskColor(selectedTemplate.riskLevel)}>
                {selectedTemplate.riskLevel.toUpperCase()} RISK
              </Badge>
              <Badge variant="outline" className="border-slate-500 text-slate-300">
                ⏱️ {selectedTemplate.estimatedTime}
              </Badge>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Form Fields */}
          {selectedTemplate.formFields.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-white">Configuration</h3>
              
              {selectedTemplate.formFields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <label className="text-sm font-medium text-slate-200">
                    {field.label}
                    {field.required && <span className="text-red-400">*</span>}
                  </label>

                  {field.type === 'text' && (
                    <Input
                      type="text"
                      placeholder={field.placeholder}
                      value={formValues[field.name] ?? ''}
                      onChange={(e) => handleInputChange(field.name, e.target.value)}
                      className="bg-slate-700 border-slate-600 text-white"
                      disabled={isLoading}
                    />
                  )}

                  {field.type === 'number' && (
                    <Input
                      type="number"
                      placeholder={field.placeholder}
                      value={formValues[field.name] ?? ''}
                      onChange={(e) => handleInputChange(field.name, parseFloat(e.target.value))}
                      min={field.min}
                      max={field.max}
                      step="any"
                      className="bg-slate-700 border-slate-600 text-white"
                      disabled={isLoading}
                    />
                  )}

                  {field.type === 'percentage' && (
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        placeholder={field.placeholder}
                        value={formValues[field.name] ?? ''}
                        onChange={(e) => handleInputChange(field.name, parseFloat(e.target.value))}
                        min={field.min}
                        max={field.max}
                        step="0.1"
                        className="bg-slate-700 border-slate-600 text-white"
                        disabled={isLoading}
                      />
                      <span className="text-slate-400">%</span>
                    </div>
                  )}

                  {field.type === 'select' && (
                    <Select value={formValues[field.name] ?? field.default} onValueChange={(value) => handleInputChange(field.name, value)}>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-700 border-slate-600">
                        {field.options?.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-white">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {field.help && (
                    <p className="text-xs text-slate-400">{field.help}</p>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Default Values Display */}
          <div className="bg-slate-700/50 p-4 rounded border border-slate-600">
            <h4 className="text-xs font-semibold text-slate-300 mb-3">STRATEGY DEFAULTS</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {Object.entries(selectedTemplate.defaultInput).map(([key, value]) => (
                <div key={key} className="text-slate-400">
                  <span className="text-slate-500">{key}:</span>
                  <span className="text-slate-300 ml-1">
                    {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <Button
              onClick={handleExecute}
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 text-white font-semibold"
            >
              {isLoading ? (
                <>
                  <span className="animate-spin mr-2">⏳</span>
                  Executing...
                </>
              ) : (
                <>
                  {selectedTemplate.icon} Execute {selectedTemplate.name}
                </>
              )}
            </Button>
            
            <Button
              onClick={() => {
                setSelectedTemplate(null);
                setFormValues({});
              }}
              variant="outline"
              disabled={isLoading}
              className="border-slate-600 text-slate-300 hover:bg-slate-700"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show template list
  return (
    <div className="w-full space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-slate-800 border border-slate-700">
          <TabsTrigger value="all" className="text-slate-300">All Templates</TabsTrigger>
          <TabsTrigger value="trading" className="text-slate-300">Trading</TabsTrigger>
          <TabsTrigger value="analysis" className="text-slate-300">Analysis</TabsTrigger>
          <TabsTrigger value="automation" className="text-slate-300">Automation</TabsTrigger>
        </TabsList>

        {/* All Templates */}
        <TabsContent value="all" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {STRATEGY_TEMPLATES.map((template) => (
              <TemplateCard
                key={template.id}
                template={template}
                onSelect={() => handleTemplateClick(template)}
                isLoading={isLoading}
              />
            ))}
          </div>
        </TabsContent>

        {/* Categorized Templates */}
        {Object.entries(categories).map(([category, templates]) => (
          <TabsContent key={category} value={category.toLowerCase()} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template) => (
                <TemplateCard
                  key={template.id}
                  template={template}
                  onSelect={() => handleTemplateClick(template)}
                  isLoading={isLoading}
                />
              ))}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}

/**
 * Individual template card
 */
function TemplateCard({
  template,
  onSelect,
  isLoading,
}: {
  template: StrategyTemplate;
  onSelect: () => void;
  isLoading: boolean;
}) {
  const getRiskBgColor = (risk: string) => {
    switch (risk) {
      case 'low':
        return 'from-green-600/30 to-green-500/30';
      case 'medium':
        return 'from-yellow-600/30 to-yellow-500/30';
      case 'high':
        return 'from-red-600/30 to-red-500/30';
      default:
        return 'from-slate-600/30 to-slate-500/30';
    }
  };

  return (
    <button
      onClick={onSelect}
      disabled={isLoading}
      className={`relative p-4 rounded-lg border border-slate-600 bg-gradient-to-br ${getRiskBgColor(template.riskLevel)} hover:border-slate-500 hover:bg-slate-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-left group`}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-5 bg-gradient-to-br ${template.color} rounded-lg transition-opacity pointer-events-none`} />

      {/* Content */}
      <div className="relative space-y-3">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="text-2xl">{template.icon}</div>
          <Badge 
            variant="outline" 
            className={cn(
              'text-xs',
              template.riskLevel === 'low' && 'bg-green-500/20 text-green-400 border-green-500',
              template.riskLevel === 'medium' && 'bg-yellow-500/20 text-yellow-400 border-yellow-500',
              template.riskLevel === 'high' && 'bg-red-500/20 text-red-400 border-red-500',
            )}
          >
            {template.riskLevel}
          </Badge>
        </div>

        {/* Title */}
        <div>
          <h3 className="font-semibold text-white text-sm">{template.name}</h3>
          <p className="text-xs text-slate-400 mt-1">{template.description}</p>
        </div>

        {/* Meta */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-600">
          <span className="text-xs text-slate-400">⏱️ {template.estimatedTime}</span>
          <span className="text-xs text-slate-500 group-hover:text-slate-300 transition-colors">
            Use Template →
          </span>
        </div>
      </div>
    </button>
  );
}

export default StrategyTemplates;
