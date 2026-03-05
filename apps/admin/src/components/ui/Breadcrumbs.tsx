"use client";

import React from "react";
import Link from "next/link";

type BreadcrumbItem = {
  label: string;
  href?: string;
};

type BreadcrumbsProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export default function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav
      className={["crumbs", className].filter(Boolean).join(" ")}
      aria-label="Breadcrumbs"
      id="breadcrumbs"
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        const id = isLast ? "crumb-current" : undefined;
        return (
          <React.Fragment key={`${item.label}-${index}`}>
            {index > 0 && <span className="sep">&gt;</span>}
            {item.href ? (
              <Link href={item.href} id={id}>
                {item.label}
              </Link>
            ) : (
              <span id={id} style={{ color: "rgb(var(--foreground))", fontWeight: 900 }}>
                {item.label}
              </span>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
}