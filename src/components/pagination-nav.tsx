import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/shared/utils";

type PaginationNavProps = {
  currentPage: number;
  totalPages: number;
  total: number;
  offset: number;
  limit: number;
  buildHref: (page: number) => string;
};

export function PaginationNav({
  currentPage,
  totalPages,
  total,
  offset,
  limit,
  buildHref,
}: PaginationNavProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-sm text-muted-foreground">
        Showing {offset + 1}-{Math.min(offset + limit, total)} of {total} items
      </p>
      <Pagination>
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href={currentPage > 1 ? buildHref(currentPage - 1) : "#"}
              aria-disabled={currentPage <= 1}
              className={cn(
                currentPage <= 1 && "pointer-events-none opacity-50",
              )}
            />
          </PaginationItem>

          {currentPage > 2 && (
            <PaginationItem>
              <PaginationLink href={buildHref(1)}>1</PaginationLink>
            </PaginationItem>
          )}

          {currentPage > 3 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}

          {currentPage > 1 && (
            <PaginationItem>
              <PaginationLink href={buildHref(currentPage - 1)}>
                {currentPage - 1}
              </PaginationLink>
            </PaginationItem>
          )}

          <PaginationItem>
            <PaginationLink href={buildHref(currentPage)} isActive>
              {currentPage}
            </PaginationLink>
          </PaginationItem>

          {currentPage < totalPages && (
            <PaginationItem>
              <PaginationLink href={buildHref(currentPage + 1)}>
                {currentPage + 1}
              </PaginationLink>
            </PaginationItem>
          )}

          {currentPage < totalPages - 2 && (
            <PaginationItem>
              <PaginationEllipsis />
            </PaginationItem>
          )}

          {currentPage < totalPages - 1 && (
            <PaginationItem>
              <PaginationLink href={buildHref(totalPages)}>
                {totalPages}
              </PaginationLink>
            </PaginationItem>
          )}

          <PaginationItem>
            <PaginationNext
              href={currentPage < totalPages ? buildHref(currentPage + 1) : "#"}
              aria-disabled={currentPage >= totalPages}
              className={cn(
                currentPage >= totalPages && "pointer-events-none opacity-50",
              )}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
