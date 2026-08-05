import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN.js";
import { MemoryRouter, Route, Routes } from "react-router-dom";

import CanvasPage from "@/pages/canvas/project";
import { getAntThemeConfig } from "@/lib/app-theme";
import { useCanvasStore, type CanvasProject } from "@/stores/canvas/use-canvas-store";
import { useThemeStore, type ThemeName } from "@/stores/use-theme-store";
import { CanvasNodeType } from "@/types/canvas";
import type { CanvasConnection, CanvasNodeData, CanvasNodeMetadata, ViewportTransform } from "@/types/canvas";

import "./styles.css";

export type InexgrowCanvasProps = {
    project: CanvasProject;
    theme?: ThemeName;
    className?: string;
    style?: CSSProperties;
    onProjectChange?: (project: CanvasProject) => void;
    onGenerateNode?: (request: InexgrowCanvasGenerateNodeRequest) => void | Promise<void>;
};

export type InexgrowCanvasGenerateNodeRequest = {
    nodeId: string;
    mode: "text" | "image" | "video" | "audio";
    prompt: string;
    node: CanvasNodeData;
};

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 30_000,
            retry: false,
            refetchOnWindowFocus: false,
        },
    },
});

export function InexgrowCanvas(props: InexgrowCanvasProps) {
    return <EmbeddedCanvas key={props.project.id} {...props} />;
}

function EmbeddedCanvas({ project, theme = "light", className, style, onProjectChange, onGenerateNode }: InexgrowCanvasProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const hydrated = useCanvasStore((state) => state.hydrated);
    const currentProject = useCanvasStore((state) => state.projects.find((item) => item.id === project.id));
    const [ready, setReady] = useState(false);
    const lastHostVersionRef = useRef("");
    const lastEmittedVersionRef = useRef("");
    const normalizedProject = useMemo(() => normalizeProject(project), [project]);
    const hostVersion = normalizedProject.updatedAt;

    useEffect(() => {
        useThemeStore.getState().setTheme(theme);
    }, [theme]);

    useEffect(() => {
        if (!hydrated) return;
        const store = useCanvasStore.getState();
        const existing = store.projects.find((item) => item.id === normalizedProject.id);
        if (!existing || (hostVersion !== lastHostVersionRef.current && existing.updatedAt !== hostVersion)) {
            store.replaceProjects([normalizedProject, ...store.projects.filter((item) => item.id !== normalizedProject.id)]);
        }
        lastHostVersionRef.current = hostVersion;
        lastEmittedVersionRef.current = hostVersion;
        setReady(true);
    }, [hostVersion, hydrated, normalizedProject]);

    useEffect(() => {
        if (!ready || !currentProject || currentProject.updatedAt === lastEmittedVersionRef.current) return;
        lastEmittedVersionRef.current = currentProject.updatedAt;
        onProjectChange?.(currentProject);
    }, [currentProject, onProjectChange, ready]);

    const dark = theme === "dark";
    const rootClassName = ["inexgrow-canvas-root", dark ? "dark" : "", className || ""].filter(Boolean).join(" ");

    return (
        <div ref={rootRef} className={rootClassName} data-inexgrow-canvas-theme={theme} style={style}>
            <ConfigProvider locale={zhCN} theme={getAntThemeConfig(dark)} getPopupContainer={() => rootRef.current || document.body}>
                <App className="inexgrow-canvas-app">
                    <QueryClientProvider client={queryClient}>
                        {ready ? (
                            <MemoryRouter initialEntries={[`/canvas/${encodeURIComponent(project.id)}`]}>
                                <Routes>
                                    <Route path="/canvas/:id" element={<CanvasPage embedded onGenerateNode={onGenerateNode} />} />
                                </Routes>
                            </MemoryRouter>
                        ) : (
                            <div className="inexgrow-canvas-loading">正在加载画布…</div>
                        )}
                    </QueryClientProvider>
                </App>
            </ConfigProvider>
        </div>
    );
}

function normalizeProject(project: CanvasProject): CanvasProject {
    const now = new Date().toISOString();
    return {
        id: project.id,
        title: project.title || "未命名画布",
        createdAt: project.createdAt || now,
        updatedAt: project.updatedAt || now,
        nodes: Array.isArray(project.nodes) ? project.nodes : [],
        connections: Array.isArray(project.connections) ? project.connections : [],
        chatSessions: Array.isArray(project.chatSessions) ? project.chatSessions : [],
        activeChatId: project.activeChatId || null,
        backgroundMode: project.backgroundMode || "lines",
        showImageInfo: Boolean(project.showImageInfo),
        viewport: project.viewport || { x: 0, y: 0, k: 1 },
    };
}

export { CanvasNodeType };
export type { CanvasConnection, CanvasNodeData, CanvasNodeMetadata, CanvasProject, ThemeName, ViewportTransform };
