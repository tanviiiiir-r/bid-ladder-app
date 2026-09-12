import { queryOptions } from "@tanstack/react-query";

import { getBoard, getCategories, getListing } from "./board.functions";

export const categoriesQuery = () =>
  queryOptions({
    queryKey: ["categories"],
    queryFn: () => getCategories(),
    staleTime: 5 * 60 * 1000,
  });

export const boardQuery = (category: string) =>
  queryOptions({
    queryKey: ["board", category],
    queryFn: () => getBoard({ data: { category } }),
  });

export const listingQuery = (slug: string) =>
  queryOptions({
    queryKey: ["listing", slug],
    queryFn: () => getListing({ data: { slug } }),
  });
