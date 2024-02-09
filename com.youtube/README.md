# 🔌 com.youtube

Adds recent videos published by YouTube channels you are subscribed to.

> [!WARNING]  
> This plugin is not stable and relies on a hack where an empty `client_secret` query parameter is injected into the URLs Tapestry call when performing the OAuth flow. This causes the OAuth flow to fail sometimes. If that happens, you need to try again.
>
> Furthermore, Tapestry does not seem able to keep the session alive as YouTube does not provide a refresh token.

## Installation

The plugin requires you to authenticate with your YouTube account using an OAuth flow.
In order to perform such a flow, you must have a Google Cloud project setup.
Follow the instructions below to create a Google Cloud app and obtain the client ID and client secret needed to perform the OAuth flow.

1. Open [console.cloud.google.com/apis](https://console.cloud.google.com/apis) and create a new project.
2. Once your project is created, select "OAuth consent screen" in the sidebar to configure the consent screen for your app. Select “External” when asked to about the user type. When asked to add test users, add your own email.
5. Enable the YouTube API in your newly created project by navigating to [console.cloud.google.com/apis/library](https://console.cloud.google.com/apis/library) then select "YouTube Data API v3" and enable it.
3. Navigate to [console.cloud.google.com/apis/credentials](https://console.cloud.google.com/apis/credentials) and create an OAuth client by selecting "Create credentials" followed by "OAuth client ID". Select "Web application" for the application type and add `https://iconfactory.com/muxer` as a redirect URI.
4. Copy the client ID and client secret and add it to Tapestry.

## Configuration

The plugin can be configured with the following variables.

|Variable|Description|Example|
|-|-|-|
|Site|Set this to https://youtube.com|https://youtube.com|
|Number of channels|Set this to the number of channels to be added to your feed.|10|
