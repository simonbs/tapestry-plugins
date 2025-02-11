# 🔌 com.slack

Adds the most recent posts from a specific Slack channel.

> [!IMPORTANT]
> Images in messages do not currently load as it requires authentication which Tapestry doesn't support at the time of writing this.

## Installation

The plugin requires you to authenticate with your Slack account using an OAuth flow.
In order to perform such a flow, you must have a Slack app installed in your workspace.
Follow the instructions below to create a Slack app and obtain the client ID and client secret needed to perform the OAuth flow.

1. Open [api.slack.com/apps](https://api.slack.com/apps)
2. Select "Create New App" followed by "From scratch".
4. Enter a name for your app, e.g. "Tapestry", and select the workspace to install the app in and then select "Create App".
5. Add a redirect URL by select "OAuth & Permissions" in the sidebar followed by "Add New Redirect URL", set the URL to [https://iconfactory.com/tapestry-oauth](https://iconfactory.com/tapestry-oauth), and save the changes.
6. Scroll down to "Scopes" and add the following scopes under "User Token Scopes": `channels:history`, `channels:read`, and `users.profile:read`.
7. Install the app by selecting "Basic Information" in the sidebar, expand the "Install your app" section, and select "Install to Workspace".
8. Copy the client ID and client secret under "Basic Information" and enter it into Tapestry.

## Configuration

The plugin can be configured with the following variables.

|Variable|Description|Example|
|-|-|-|
|Site|Set this to https://slack.com|https://slack.com|
|Channels|Comma-separated list of channels from which to fetch posts.|lounge, random, photos|
