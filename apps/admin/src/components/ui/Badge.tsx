import React from 'react';
import clsx from 'clsx';

type BadgeProps = React.HTMLAttributes<HTMLSpanElement> & {
  tone?: 'default' | 'success' | 'warning' | 'error' | 'info';
  variant?: 'default' | 'outline';
};

export function Badge({ tone = 'default', variant = 'default', className, ...props }: BadgeProps) {
  const toneClasses = {
    default: 'badge',
    success: 'badge !text-emerald-700 !bg-emerald-50 !border-emerald-200/80 dark:!text-emerald-300 dark:!bg-emerald-500/10 dark:!border-emerald-500/20',
    warning: 'badge !text-amber-700 !bg-amber-50 !border-amber-200/80 dark:!text-amber-300 dark:!bg-amber-500/10 dark:!border-amber-500/20',
    error: 'badge !text-red-700 !bg-red-50 !border-red-200/80 dark:!text-red-300 dark:!bg-red-500/10 dark:!border-red-500/20',
    info: 'badge !text-blue-700 !bg-blue-50 !border-blue-200/80 dark:!text-blue-300 dark:!bg-blue-500/10 dark:!border-blue-500/20',
  }[tone];

  const variantClass = variant === 'outline' ? 'bg-transparent border' : '';

  return (
    <span
      className={clsx(toneClasses, variantClass, 'whitespace-nowrap', className)}
      {...props}
    />
  );
}

export function getRoleBadgeClasses(role: string): string {
  const roleColors: Record<string, string> = {
    'viewer': '!text-gray-700 !bg-gray-100 !border-gray-300/50 dark:!text-gray-300 dark:!bg-gray-500/10 dark:!border-gray-500/20',
    'editor': '!text-blue-700 !bg-blue-50 !border-blue-200/80 dark:!text-blue-300 dark:!bg-blue-500/10 dark:!border-blue-500/20',
    'editor-in-chief': '!text-purple-700 !bg-purple-50 !border-purple-200/80 dark:!text-purple-300 dark:!bg-purple-500/10 dark:!border-purple-500/20',
    'editor_in_chief': '!text-purple-700 !bg-purple-50 !border-purple-200/80 dark:!text-purple-300 dark:!bg-purple-500/10 dark:!border-purple-500/20',
    'marketing': '!text-pink-700 !bg-pink-50 !border-pink-200/80 dark:!text-pink-300 dark:!bg-pink-500/10 dark:!border-pink-500/20',
    'marketing_manager': '!text-pink-700 !bg-pink-50 !border-pink-200/80 dark:!text-pink-300 dark:!bg-pink-500/10 dark:!border-pink-500/20',
    'marketing_editor': '!text-pink-700 !bg-pink-50 !border-pink-200/80 dark:!text-pink-300 dark:!bg-pink-500/10 dark:!border-pink-500/20',
    'marketing_publisher': '!text-pink-700 !bg-pink-50 !border-pink-200/80 dark:!text-pink-300 dark:!bg-pink-500/10 dark:!border-pink-500/20',
    'marketing_viewer': '!text-pink-700 !bg-pink-50 !border-pink-200/80 dark:!text-pink-300 dark:!bg-pink-500/10 dark:!border-pink-500/20',
    'admin': '!text-indigo-700 !bg-indigo-50 !border-indigo-200/80 dark:!text-indigo-300 dark:!bg-indigo-500/10 dark:!border-indigo-500/20',
    'owner': '!text-amber-700 !bg-amber-50 !border-amber-200/80 dark:!text-amber-300 dark:!bg-amber-500/10 dark:!border-amber-500/20',
    'user': '!text-gray-700 !bg-gray-100 !border-gray-300/50 dark:!text-gray-300 dark:!bg-gray-500/10 dark:!border-gray-500/20',
    'super_admin': '!bg-gradient-to-r !from-amber-500 !to-orange-500 !text-white !border-amber-500/50',
    'system_admin': '!text-red-700 !bg-red-50 !border-red-200/80 dark:!text-red-300 dark:!bg-red-500/10 dark:!border-red-500/20',
    'system_dev': '!text-green-700 !bg-green-50 !border-green-200/80 dark:!text-green-300 dark:!bg-green-500/10 dark:!border-green-500/20',
    'system_support': '!text-cyan-700 !bg-cyan-50 !border-cyan-200/80 dark:!text-cyan-300 dark:!bg-cyan-500/10 dark:!border-cyan-500/20',
    'org_admin': '!text-indigo-700 !bg-indigo-50 !border-indigo-200/80 dark:!text-indigo-300 dark:!bg-indigo-500/10 dark:!border-indigo-500/20',
    'org_member': '!text-gray-700 !bg-gray-100 !border-gray-300/50 dark:!text-gray-300 dark:!bg-gray-500/10 dark:!border-gray-500/20',
    'site_admin': '!text-indigo-700 !bg-indigo-50 !border-indigo-200/80 dark:!text-indigo-300 dark:!bg-indigo-500/10 dark:!border-indigo-500/20',
    'publisher': '!text-teal-700 !bg-teal-50 !border-teal-200/80 dark:!text-teal-300 dark:!bg-teal-500/10 dark:!border-teal-500/20',
  };

  return roleColors[role.toLowerCase()] || '!text-gray-700 !bg-gray-100 !border-gray-300/50 dark:!text-gray-300 dark:!bg-gray-500/10 dark:!border-gray-500/20';
}

export default Badge;
