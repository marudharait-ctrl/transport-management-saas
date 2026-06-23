export function appBaseUrl() {
  return (process.env.APP_BASE_URL || "https://tasks.iananas.eu").replace(/\/$/, "");
}

export function vendorQuoteUrl(accessToken: string) {
  return `${appBaseUrl()}/vendor/quote/${accessToken}`;
}

export function vendorOrderUrl(accessToken: string) {
  return `${appBaseUrl()}/vendor/order/${accessToken}`;
}
