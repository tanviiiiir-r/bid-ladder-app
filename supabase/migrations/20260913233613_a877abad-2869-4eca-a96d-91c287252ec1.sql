REVOKE EXECUTE ON FUNCTION public.admin_grant_credits(uuid, integer, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.set_allocation(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.freeze_daily_board(date) FROM anon, authenticated;