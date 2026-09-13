import { queryOptions } from "@tanstack/react-query";

import { getBoard, getCategories, getDailyArchiveDates, getListing } from "./board.functions";
import type { BoardKind } from "./ranking";

export const categoriesQuery = () =>
  queryOptions({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
    staleTime: 5 * 60 * 1000,
  });

export const boardQuery = (category: string, board: BoardKind = "all_time", date?: string) =>
  queryOptions({
    queryKey: ["board", category, board, date ?? null],
    queryFn: () => getBoard({ data: { category, board, ...(date ? { date } : {}) } }),
  });

export const listingQuery = (slug: string, board: BoardKind = "all_time", date?: string) =>
  queryOptions({
    queryKey: ["listing", slug, board, date ?? null],
    queryFn: () => getListing({ data: { slug, board, ...(date ? { date } : {}) } }),
  });

export const dailyArchiveDatesQuery = () =>
  queryOptions({
    queryKey: ["daily-archive-dates"],
    queryFn: () => getDailyArchiveDates(),
    staleTime: 60 * 1000,
  });
