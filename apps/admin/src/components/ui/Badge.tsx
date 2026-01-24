import React from 'react';
import clsx from 'clsx';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: 'default' | 'success' | 'warning' | 'error';
  variant?: 'default' | 'outline';
};

export function Badge({ tone = 'default', variant = 'default', className, ...props }: BadgeProps) {
  const toneClass = {
    default: 'badge',
    success: 'badge text-emerald-700 bg-emerald-50 border-emerald-200',
    warning: 'badge text-amber-700 bg-amber-50 border-amber-200',
    error: 'badge text-red-700 bg-red-50 border-red-200',
  }[tone];

  const variantClass = variant === 'outline' ? 'bg-transparent border' : '';

  return (
    <span 
      className={clsx(toneClass, variantClass, 'whitespace-nowrap', className)} 
      {...props} 
    />
  );
}

/**
 * Get badge color classes for a specific role
 */
export function getRoleBadgeClasses(role: string): string {
  const roleColors: Record<string, string> = {
    // Site Roles
    'viewer': '!text-gray-700 !bg-gray-100 !border-gray-400 dark:!text-gray-300 dark:!bg-gray-800 dark:!border-gray-600',
    'editor': '!text-blue-700 !bg-blue-100 !border-blue-400 dark:!text-blue-300 dark:!bg-blue-900/50 dark:!border-blue-600',
    'editor-in-chief': '!text-purple-700 !bg-purple-100 !border-purple-400 dark:!text-purple-300 dark:!bg-purple-900/50 dark:!border-purple-600',
    'marketing': '!text-pink-700 !bg-pink-100 !border-pink-400 dark:!text-pink-300 dark:!bg-pink-900/50 dark:!border-pink-600',
    'admin': '!text-indigo-700 !bg-indigo-100 !border-indigo-400 dark:!text-indigo-300 dark:!bg-indigo-900/50 dark:!border-indigo-600',
    'owner': '!text-amber-700 !bg-amber-100 !border-amber-400 dark:!text-amber-300 dark:!bg-amber-900/50 dark:!border-amber-600',
    
    // Platform Roles
    'user': '!text-gray-700 !bg-gray-100 !border-gray-400 dark:!text-gray-300 dark:!bg-gray-800 dark:!border-gray-600',
    
    // System Roles
    'super_admin': '!bg-gradient-to-r !from-yellow-400 !to-orange-500 !text-white !border-yellow-500 dark:!from-yellow-500 dark:!to-orange-600',
    'system_admin': '!text-red-700 !bg-red-100 !border-red-400 dark:!text-red-300 dark:!bg-red-900/50 dark:!border-red-600',
    'system_dev': '!text-green-700 !bg-green-100 !border-green-400 dark:!text-green-300 dark:!bg-green-900/50 dark:!border-green-600',
    'system_support': '!text-cyan-700 !bg-cyan-100 !border-cyan-400 dark:!text-cyan-300 dark:!bg-cyan-900/50 dark:!border-cyan-600',
    
    // Backward compatibility
    'org_admin': '!text-indigo-700 !bg-indigo-100 !border-indigo-400 dark:!text-indigo-300 dark:!bg-indigo-900/50 dark:!border-indigo-600',
    'site_admin': '!text-indigo-700 !bg-indigo-100 !border-indigo-400 dark:!text-indigo-300 dark:!bg-indigo-900/50 dark:!border-indigo-600',
  };

  return roleColors[role.toLowerCase()] || '!text-gray-700 !bg-gray-100 !border-gray-400 dark:!text-gray-300 dark:!bg-gray-800 dark:!border-gray-600';
}

export default Badge;

