"use client";

import { Card, Spin } from "antd";

const ProjectsLoading = () => {
  return (
    <Card style={{ minHeight: 320 }}>
      <div className="flex min-h-[272px] items-center justify-center">
        <Spin size="large" />
      </div>
    </Card>
  );
};

export default ProjectsLoading;
