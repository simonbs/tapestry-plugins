**Shows the most recent posts from a specific Slack channel.**

**Important:** Images in messages do not currently load because authentication is required, which Tapestry does not support at this time.

This plugin requires authentication with your Slack account using an OAuth flow. To perform this flow, you must have a Slack app installed in your workspace. Follow the steps below to create a Slack app and obtain the client ID and client secret needed for authentication:

1. Open [api.slack.com/apps](https://api.slack.com/apps).
2. Click "Create New App" and select "From scratch".
3. Enter a name for your app, such as "Tapestry".
4. Select the workspace where you want to install the app and click "Create App".
5. Go to "OAuth & Permissions" in the sidebar.
6. Click "Add New Redirect URL" and set the URL to [https://iconfactory.com/tapestry-oauth](https://iconfactory.com/tapestry-oauth).
7. Save the changes.
8. Scroll down to "Scopes".
9. Under User Token Scopes, add the following scopes: `channels:history`, `channels:read`, and `users.profile:read`.
10. Go to "Basic Information" in the sidebar.
11. Expand the "Install your app" section.
12. Click "Install to Workspace".
13. Copy the client ID and client secret from "Basic Information".
14. Enter the client ID and client secret when configuring the connector in Tapestry.

When configuring the connector, specify a comma-separated list of channels to fetch posts from (e.g., lounge, random, photos).
