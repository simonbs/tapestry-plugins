**Shows recent videos published by YouTube channels you are subscribed to.**

This plugin requires authentication with your YouTube account using an OAuth flow.
To perform an OAuth flow, you must set up a Google Cloud project. Follow these steps to create a Google Cloud app and obtain the client ID and client secret needed for authentication:

1. Open [console.cloud.google.com/apis](https://console.cloud.google.com/apis) and create a new project.
2. Go to "OAuth consent screen" in the sidebar and configure the consent screen for your app.
3. Select "External" as the user type.
4. When prompted to add test users, enter your own email.
5. Go to [console.cloud.google.com/apis/library](https://console.cloud.google.com/apis/library) and enable the YouTube API for your project.
6. Select "YouTube Data API v3" and enable it.
7. Go to [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) and create an OAuth client.
8. Click "Create credentials" and select "OAuth client ID".
9. Select "Web application" as the application type.
10. Add [https://iconfactory.com/tapestry-oauth](https://iconfactory.com/tapestry-oauth) as a redirect URI.
11. Copy the client ID and client secret, then add them to the connector in Tapestry.
