"use client";

import { Button } from "antd";
import { createProjectAction } from "@/http/actions/project.action";

export default function TestSentry() {
    return (
        <Button
            onClick={async () => {
                await createProjectAction({
                    name: "Test Project",
                    baseRate: 100,
                });
            }}
        >
            Test Project Action
        </Button>
    );
}