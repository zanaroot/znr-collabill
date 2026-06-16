"use client";

import { GithubOutlined, SlackOutlined } from "@ant-design/icons";
import { Alert, Modal, Typography } from "antd";

const { Title, Paragraph, Text, Link } = Typography;

interface IntegrationHelpModalProps {
  open: boolean;
  provider: "SLACK" | "GITHUB";
  onClose: () => void;
}

const SlackHelpContent = () => (
  <div>
    <Paragraph>
      Slack integration lets Collabill post task notifications, mentions, and
      status updates to your workspace channels.
    </Paragraph>

    <Title level={5}>
      <Text code>Slack Bot Token</Text> <Text type="secondary">(xoxb-...)</Text>
    </Title>
    <Paragraph>
      <Text strong>What it is: </Text>A Bot User OAuth Token issued by Slack for
      the bot app you install in your workspace. Collabill uses it to
      authenticate every API call and to post messages on behalf of the bot.
    </Paragraph>
    <Paragraph>
      <Text strong>Where to find it: </Text>
      <ol style={{ paddingLeft: 20, marginBottom: 0 }}>
        <li>
          Go to{" "}
          <Link
            href="https://api.slack.com/apps"
            target="_blank"
            rel="noopener noreferrer"
          >
            api.slack.com/apps
          </Link>{" "}
          and select (or create) your app.
        </li>
        <li>
          Open <Text code>OAuth & Permissions</Text> in the sidebar.
        </li>
        <li>
          Under <Text code>Bot Token Scopes</Text>, add the scopes your bot
          needs (typically <Text code>chat:write</Text> at minimum).
        </li>
        <li>
          Click <Text code>Install to Workspace</Text> and authorize the app.
        </li>
        <li>
          Copy the <Text code>Bot User OAuth Token</Text> — it starts with{" "}
          <Text code>xoxb-</Text>.
        </li>
      </ol>
    </Paragraph>
    <Alert
      type="warning"
      showIcon
      message="Never share this token. It grants access to post messages in your workspace."
      style={{ marginBottom: 16 }}
    />

    <Title level={5}>
      <Text code>Default Channel</Text>{" "}
      <Text type="secondary">(#channel-name)</Text>
    </Title>
    <Paragraph>
      <Text strong>What it is: </Text>
      The fallback Slack channel where Collabill sends notifications when a
      project has no channel override.
    </Paragraph>
    <Paragraph>
      <Text strong>Where to find it: </Text>
      <ol style={{ paddingLeft: 20, marginBottom: 0 }}>
        <li>
          Open Slack and locate the channel you want to use as the default (e.g.{" "}
          <Text code>#general</Text>).
        </li>
        <li>
          Right-click the channel name → <Text code>View channel details</Text>{" "}
          → scroll to the bottom. The <Text code>Channel ID</Text> starts with{" "}
          <Text code>C</Text> (e.g. <Text code>C0123456789</Text>).
        </li>
        <li>
          Paste either the channel name (with <Text code>#</Text>) or the
          channel ID into the field.
        </li>
      </ol>
    </Paragraph>
    <Paragraph>
      <Text strong>Heads up: </Text>
      the bot must already be invited to that channel in Slack — otherwise posts
      will fail silently. Run <Text code>/invite @YourBotName</Text> in the
      channel first.
    </Paragraph>
  </div>
);

const GitHubHelpContent = () => (
  <div>
    <Paragraph>
      GitHub integration lets Collabill read repository data and automate branch
      and commit operations on your behalf.
    </Paragraph>

    <Title level={5}>
      <Text code>Personal Access Token</Text>{" "}
      <Text type="secondary">(ghp_... / github_pat_...)</Text>
    </Title>
    <Paragraph>
      <Text strong>What it is: </Text>A GitHub token that authenticates the
      Collabill integration as your user (or as a dedicated bot account). It is
      used to list branches, read commits, create branches, and open pull
      requests.
    </Paragraph>
    <Paragraph>
      <Text strong>Where to find it: </Text>
      <ol style={{ paddingLeft: 20, marginBottom: 0 }}>
        <li>
          Go to{" "}
          <Link
            href="https://github.com/settings/tokens"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub → Settings → Developer settings → Personal access tokens
          </Link>
          .
        </li>
        <li>
          Click <Text code>Generate new token</Text> (fine-grained tokens are
          recommended).
        </li>
        <li>
          Set an expiration and grant at least the <Text code>repo</Text> scope
          (classic) or <Text code>Contents: Read &amp; Write</Text> +{" "}
          <Text code>Pull requests: Read &amp; Write</Text> (fine-grained).
        </li>
        <li>
          Generate the token and copy it immediately — GitHub will not show it
          again. It starts with <Text code>ghp_</Text> (classic) or{" "}
          <Text code>github_pat_</Text> (fine-grained).
        </li>
      </ol>
    </Paragraph>
    <Alert
      type="warning"
      showIcon
      message="Treat this token like a password. Anyone with it can act on your behalf on the repositories it can access."
      style={{ marginBottom: 16 }}
    />
    <Paragraph>
      <Text strong>Heads up: </Text>
      if you scope the token to specific repositories, make sure every project
      that needs GitHub automation is included — otherwise requests will fail
      with a <Text code>404</Text>.
    </Paragraph>
  </div>
);

export const IntegrationHelpModal = ({
  open,
  provider,
  onClose,
}: IntegrationHelpModalProps) => {
  const isSlack = provider === "SLACK";

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      title={
        <span>
          {isSlack ? <SlackOutlined /> : <GithubOutlined />}{" "}
          {isSlack ? "Slack" : "GitHub"} Integration — Setup Guide
        </span>
      }
      centered
      width={640}
      destroyOnHidden
    >
      {isSlack ? <SlackHelpContent /> : <GitHubHelpContent />}
    </Modal>
  );
};
