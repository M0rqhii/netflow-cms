import { Injectable } from '@nestjs/common';
import * as client from 'prom-client';

/**
 * Prometheus Metrics Service
 * Provides Prometheus metrics for monitoring using prom-client
 * Tracks HTTP requests, database queries, and performance metrics
 */
@Injectable()
export class PrometheusService {
  
  // Prometheus Registry
  private readonly register: client.Registry;
  
  // HTTP Metrics
  private readonly httpRequestDuration: client.Histogram<string>;
  private readonly httpRequestTotal: client.Counter<string>;
  private readonly httpRequestErrors: client.Counter<string>;
  
  // Database Metrics
  private readonly dbQueryDuration: client.Histogram<string>;
  private readonly dbQueryTotal: client.Counter<string>;
  private readonly dbQueryErrors: client.Counter<string>;
  
  // Application Metrics
  private readonly activeConnections: client.Gauge<string>;
  private readonly memoryUsage: client.Gauge<string>;
  
  constructor() {
    // Create a Registry to register the metrics
    this.register = new client.Registry();
    
    // Add default metrics (CPU, memory, etc.)
    client.collectDefaultMetrics({ register: this.register });
    
    // HTTP Request Duration Histogram
    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.1, 0.5, 1, 2, 5, 10],
      registers: [this.register],
    });
    
    // HTTP Request Total Counter
    this.httpRequestTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });
    
    // HTTP Request Errors Counter
    this.httpRequestErrors = new client.Counter({
      name: 'http_request_errors_total',
      help: 'Total number of HTTP request errors',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });
    
    // Database Query Duration Histogram
    this.dbQueryDuration = new client.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['operation', 'table'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
      registers: [this.register],
    });
    
    // Database Query Total Counter
    this.dbQueryTotal = new client.Counter({
      name: 'db_queries_total',
      help: 'Total number of database queries',
      labelNames: ['operation', 'table'],
      registers: [this.register],
    });
    
    // Database Query Errors Counter
    this.dbQueryErrors = new client.Counter({
      name: 'db_query_errors_total',
      help: 'Total number of database query errors',
      labelNames: ['operation', 'table'],
      registers: [this.register],
    });
    
    // Active Connections Gauge
    this.activeConnections = new client.Gauge({
      name: 'active_connections',
      help: 'Number of active connections',
      registers: [this.register],
    });
    
    // Memory Usage Gauge
    this.memoryUsage = new client.Gauge({
      name: 'memory_usage_bytes',
      help: 'Memory usage in bytes',
      labelNames: ['type'],
      registers: [this.register],
    });
    
    // Update memory usage periodically
    setInterval(() => {
      const memUsage = process.memoryUsage();
      this.memoryUsage.set({ type: 'heapUsed' }, memUsage.heapUsed);
      this.memoryUsage.set({ type: 'heapTotal' }, memUsage.heapTotal);
      this.memoryUsage.set({ type: 'rss' }, memUsage.rss);
      this.memoryUsage.set({ type: 'external' }, memUsage.external);
    }, 5000); // Update every 5 seconds
  }

  /**
   * Track HTTP request
   */
  trackHttpRequest(method: string, route: string, statusCode: number, duration: number): void {
    const durationSeconds = duration / 1000;
    const labels = {
      method,
      route,
      status_code: statusCode.toString(),
    };
    
    this.httpRequestTotal.inc(labels);
    this.httpRequestDuration.observe(labels, durationSeconds);
    
    if (statusCode >= 400) {
      this.httpRequestErrors.inc(labels);
    }
  }

  /**
   * Track database query performance
   */
  trackDbQuery(operation: string, table: string, duration: number, error?: boolean): void {
    const durationSeconds = duration / 1000;
    const labels = { operation, table };
    
    this.dbQueryTotal.inc(labels);
    this.dbQueryDuration.observe(labels, durationSeconds);
    
    if (error) {
      this.dbQueryErrors.inc(labels);
    }
  }

  /**
   * Set active connections
   */
  setActiveConnections(count: number): void {
    this.activeConnections.set(count);
  }

  /**
   * Get metrics in Prometheus format
   */
  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  /**
   * Get registry (for advanced usage)
   */
  getRegister(): client.Registry {
    return this.register;
  }
}
