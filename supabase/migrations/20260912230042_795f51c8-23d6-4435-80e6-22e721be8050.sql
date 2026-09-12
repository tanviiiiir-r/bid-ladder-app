ALTER TABLE public.listings
  ADD CONSTRAINT listings_url_https_only
  CHECK (
    url ~ '^https://[A-Za-z0-9._~%+-]+(\.[A-Za-z0-9._~%+-]+)+(:[0-9]{1,5})?(/[^\s]*)?$'
    AND length(url) <= 300
  );