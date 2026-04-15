"use client";

import { Card, Skeleton } from "antd";

const ProjectsLoading = () => {
  return (
    <Card>
      <Skeleton active paragraph={{ rows: 8 }} />
    </Card>
  );
};

export default ProjectsLoading;

