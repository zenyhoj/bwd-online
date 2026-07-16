import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PaginatedResult } from "@/types/domain";

type PaginationControlsProps = {
  basePath: string;
  pagination: Pick<PaginatedResult<unknown>, "page" | "pageCount" | "pageSize">;
  params?: Record<string, string | number | undefined>;
};

type PaginationItem = number | "ellipsis-start" | "ellipsis-end";

function getPaginationItems(page: number, pageCount: number): PaginationItem[] {
  if (pageCount <= 7) {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
  }

  if (page <= 4) {
    return [1, 2, 3, 4, 5, "ellipsis-end", pageCount];
  }

  if (page >= pageCount - 3) {
    return [1, "ellipsis-start", pageCount - 4, pageCount - 3, pageCount - 2, pageCount - 1, pageCount];
  }

  return [1, "ellipsis-start", page - 1, page, page + 1, "ellipsis-end", pageCount];
}

export function PaginationControls({ basePath, pagination, params }: PaginationControlsProps) {
  const previousPage = Math.max(1, pagination.page - 1);
  const nextPage = Math.min(pagination.pageCount, pagination.page + 1);
  const paginationItems = getPaginationItems(pagination.page, pagination.pageCount);
  const buildHref = (page: number) => {
    const searchParams = new URLSearchParams();
    searchParams.set("page", String(page));
    searchParams.set("pageSize", String(pagination.pageSize));

    Object.entries(params ?? {}).forEach(([key, value]) => {
      if (value === undefined || value === "") {
        return;
      }
      searchParams.set(key, String(value));
    });

    return `${basePath}?${searchParams.toString()}`;
  };

  return (
    <nav aria-label="Pagination" className="flex justify-center sm:justify-end">
      <div className="flex items-center gap-1.5">
        {pagination.page === 1 ? (
          <Button variant="outline" size="icon" className="h-9 w-9" disabled aria-label="Previous page">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button asChild variant="outline" size="icon" className="h-9 w-9">
            <Link href={buildHref(previousPage) as never} aria-label="Previous page">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        )}

        {paginationItems.map((item) =>
          typeof item === "number" ? (
            <Button
              key={item}
              asChild
              variant={item === pagination.page ? "default" : "outline"}
              size="icon"
              className="h-9 w-9 tabular-nums"
              aria-current={item === pagination.page ? "page" : undefined}
            >
              {item === pagination.page ? (
                <span aria-label={`Page ${item}, current page`}>{item}</span>
              ) : (
                <Link href={buildHref(item) as never} aria-label={`Go to page ${item}`}>
                  {item}
                </Link>
              )}
            </Button>
          ) : (
            <span
              key={item}
              className="flex h-9 w-7 items-center justify-center text-sm text-muted-foreground"
              aria-hidden="true"
            >
              &hellip;
            </span>
          ),
        )}

        {pagination.page === pagination.pageCount ? (
          <Button variant="outline" size="icon" className="h-9 w-9" disabled aria-label="Next page">
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </Button>
        ) : (
          <Button asChild variant="outline" size="icon" className="h-9 w-9">
            <Link href={buildHref(nextPage) as never} aria-label="Next page">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        )}
      </div>
    </nav>
  );
}
