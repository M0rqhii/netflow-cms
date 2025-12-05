import { Injectable, Logger } from '@nestjs/common';

/**
 * Prometheus Metrics Service
 * AI Note: Provides Prometheus metrics for monitoring
 * Tracks HTTP requests, database queries, and performance metrics
 * In production, install @willsoto/nestjs-prometheus and prom-client
 */
@Injectable()
export class PrometheusService {
  private readonly logger = new Logger(PrometheusService.name);
  private metrics: Map<string, number> = new Map();
  private histograms: Map<string, Array<{ value: number; timestamp: number }>> = new Map();
  
  // Track database query metrics
  private dbQueryMetrics: Map<string, { count: number; totalDuration: number; avgDuration: number }> = new Map();
  
  // Limits to prevent memory leaks
  private readonly MAX_HISTOGRAM_KEYS = 1000; // Max unique histogram keys
  private readonly MAX_METRIC_KEYS = 5000; // Max unique metric keys
  private readonly MAX_DB_METRIC_KEYS = 500; // Max unique DB metric keys
  private readonly HISTOGRAM_CLEANUP_AGE_MS = 3600000; // 1 hour - remove old histogram entries

  /**
   * Increment a counter metric
   */
  incrementCounter(name: string, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels);
    
    // Prevent memory leak - limit number of unique keys
    if (this.metrics.size >= this.MAX_METRIC_KEYS && !this.metrics.has(key)) {
      this.logger.warn(`Metric key limit reached (${this.MAX_METRIC_KEYS}), skipping new key: ${key}`);
      return;
    }
    
    this.metrics.set(key, (this.metrics.get(key) || 0) + 1);
    // In production, use prom-client: counter.inc(labels)
    this.logger.debug(`Counter ${name} incremented`, labels);
  }

  /**
   * Set a gauge metric
   */
  setGauge(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels);
    this.metrics.set(key, value);
    // In production, use prom-client: gauge.set(labels, value)
    this.logger.debug(`Gauge ${name} set to ${value}`, labels);
  }

  /**
   * Record a histogram observation
   */
  observeHistogram(name: string, value: number, labels?: Record<string, string>): void {
    const key = this.getMetricKey(name, labels);
    
    // Prevent memory leak - limit number of unique histogram keys
    if (this.histograms.size >= this.MAX_HISTOGRAM_KEYS && !this.histograms.has(key)) {
      this.logger.warn(`Histogram key limit reached (${this.MAX_HISTOGRAM_KEYS}), skipping new key: ${key}`);
      return;
    }
    
    if (!this.histograms.has(key)) {
      this.histograms.set(key, []);
    }
    const histogram = this.histograms.get(key)!;
    histogram.push({ value, timestamp: Date.now() });
    
    // Keep only last 1000 observations per histogram
    if (histogram.length > 1000) {
      histogram.shift();
    }
    
    // Cleanup old histogram entries periodically
    this.cleanupOldHistograms();
    
    this.logger.debug(`Histogram ${name} observed: ${value}`, labels);
  }
  
  /**
   * Cleanup old histogram entries to prevent memory leaks
   */
  private cleanupOldHistograms(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    
    this.histograms.forEach((observations, key) => {
      // Remove histograms with all observations older than cleanup age
      const allOld = observations.every(obs => now - obs.timestamp > this.HISTOGRAM_CLEANUP_AGE_MS);
      if (allOld && observations.length > 0) {
        keysToDelete.push(key);
      }
    });
    
    keysToDelete.forEach(key => {
      this.histograms.delete(key);
      this.logger.debug(`Cleaned up old histogram: ${key}`);
    });
  }

  /**
   * Track database query performance
   */
  trackDbQuery(model: string, operation: string, duration: number): void {
    const key = `${model}_${operation}`;
    
    // Prevent memory leak - limit number of unique DB metric keys
    if (this.dbQueryMetrics.size >= this.MAX_DB_METRIC_KEYS && !this.dbQueryMetrics.has(key)) {
      this.logger.warn(`DB metric key limit reached (${this.MAX_DB_METRIC_KEYS}), skipping new key: ${key}`);
      return;
    }
    
    const existing = this.dbQueryMetrics.get(key) || { count: 0, totalDuration: 0, avgDuration: 0 };
    existing.count++;
    existing.totalDuration += duration;
    existing.avgDuration = existing.totalDuration / existing.count;
    this.dbQueryMetrics.set(key, existing);

    // Record histogram
    this.observeHistogram('db_query_duration_ms', duration, { model, operation });

    // Track slow queries
    if (duration > 1000) {
      this.incrementCounter('db_slow_queries_total', { model, operation });
      this.logger.warn(`Slow DB query: ${key} took ${duration}ms`);
    }
  }

  /**
   * Track HTTP request
   */
  trackHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    this.incrementCounter('http_requests_total', { method, route, status: statusCode.toString() });
    this.observeHistogram('http_request_duration_ms', duration, { method, route });
    
    // Track errors
    if (statusCode >= 400) {
      this.incrementCounter('http_errors_total', { method, route, status: statusCode.toString() });
    }
    
    // Track latency buckets
    if (duration > 1000) {
      this.incrementCounter('http_slow_requests_total', { method, route });
    }
  }

  /**
   * Track cache operations
   */
  trackCacheHit(): void {
    this.incrementCounter('cache_operations_total', { operation: 'hit' });
  }

  trackCacheMiss(): void {
    this.incrementCounter('cache_operations_total', { operation: 'miss' });
  }

  /**
   * Get cache hit ratio
   */
  getCacheHitRatio(): number {
    const hits = this.metrics.get('cache_operations_total{operation="hit"}') || 0;
    const misses = this.metrics.get('cache_operations_total{operation="miss"}') || 0;
    const total = hits + misses;
    return total > 0 ? (hits / total) * 100 : 0;
  }

  /**
   * Get database query metrics
   */
  getDbQueryMetrics(): Record<string, { count: number; avgDuration: number; totalDuration: number }> {
    const result: Record<string, any> = {};
    this.dbQueryMetrics.forEach((value, key) => {
      result[key] = {
        count: value.count,
        avgDuration: value.avgDuration,
        totalDuration: value.totalDuration,
      };
    });
    return result;
  }

  /**
   * Get all metrics in Prometheus format
   * In production, use prom-client's register.metrics()
   */
  getMetrics(): string {
    const lines: string[] = [];
    
    // Counters
    lines.push('# TYPE http_requests_total counter');
    lines.push('# TYPE http_errors_total counter');
    lines.push('# TYPE db_slow_queries_total counter');
    this.metrics.forEach((value, key) => {
      lines.push(`${key} ${value}`);
    });

    // Histograms (as summaries for now)
    lines.push('\n# TYPE http_request_duration_ms summary');
    lines.push('# TYPE db_query_duration_ms summary');
    this.histograms.forEach((observations, key) => {
      if (observations.length > 0) {
        const values = observations.map(o => o.value);
        const sum = values.reduce((a, b) => a + b, 0);
        const count = values.length;
        const avg = sum / count;
        const sorted = [...values].sort((a, b) => a - b);
        const p50 = sorted[Math.floor(sorted.length * 0.5)] || 0;
        const p95 = sorted[Math.floor(sorted.length * 0.95)] || 0;
        const p99 = sorted[Math.floor(sorted.length * 0.99)] || 0;
        
        lines.push(`${key}_sum ${sum}`);
        lines.push(`${key}_count ${count}`);
        lines.push(`${key}_avg ${avg}`);
        lines.push(`${key}_p50 ${p50}`);
        lines.push(`${key}_p95 ${p95}`);
        lines.push(`${key}_p99 ${p99}`);
      }
    });

    // Database query metrics
    lines.push('\n# Database query metrics');
    this.dbQueryMetrics.forEach((value, key) => {
      lines.push(`# ${key}: count=${value.count}, avg=${value.avgDuration.toFixed(2)}ms`);
    });

    return lines.join('\n') || '# No metrics yet';
  }

  private getMetricKey(name: string, labels?: Record<string, string>): string {
    if (!labels || Object.keys(labels).length === 0) {
      return name;
    }
    const labelStr = Object.entries(labels)
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return `${name}{${labelStr}}`;
  }
}

