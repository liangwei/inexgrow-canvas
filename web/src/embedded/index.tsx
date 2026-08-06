import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
    hostManagedGeneration?: boolean;
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

function EmbeddedCanvas({ project, theme = "light", hostManagedGeneration = false, className, style, onProjectChange, onGenerateNode }: InexgrowCanvasProps) {
    const rootRef = useRef<HTMLDivElement>(null);
    const hydrated = useCanvasStore((state) => state.hydrated);
    const currentProject = useCanvasStore((state) => state.projects.find((item) => item.id === project.id));
    const [ready, setReady] = useState(false);
    const [canvasRevision, setCanvasRevision] = useState("");
    const lastHostVersionRef = useRef("");
    const lastEmittedVersionRef = useRef("");
    const projectChangeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const onProjectChangeRef = useRef(onProjectChange);
    const normalizedProject = useMemo(() => normalizeProject(project), [project]);
    const hostVersion = normalizedProject.updatedAt;

    useLayoutEffect(() => {
        useThemeStore.getState().setTheme(theme);
    }, [theme]);

    useLayoutEffect(() => {
        onProjectChangeRef.current = onProjectChange;
    }, [onProjectChange]);

    useEffect(() => {
        const store = useCanvasStore.getState();
        const existing = store.projects.find((item) => item.id === normalizedProject.id);
        if (hostVersion === lastHostVersionRef.current && existing?.updatedAt === hostVersion) {
            setReady(true);
            return;
        }
        // Mark the host revision before notifying Zustand subscribers. React 19
        // can synchronously re-enter this effect while replaceProjects emits.
        if (projectChangeTimerRef.current) {
            clearTimeout(projectChangeTimerRef.current);
            projectChangeTimerRef.current = null;
        }
        lastHostVersionRef.current = hostVersion;
        lastEmittedVersionRef.current = hostVersion;
        if (!existing || existing.updatedAt !== hostVersion) {
            store.replaceProjects([normalizedProject, ...store.projects.filter((item) => item.id !== normalizedProject.id)]);
            setCanvasRevision(hostVersion);
        }
        setReady(true);
    }, [hostVersion, hydrated, normalizedProject]);

    useEffect(() => {
        if (!ready || !currentProject || currentProject.updatedAt === lastEmittedVersionRef.current) return;
        if (lastHostVersionRef.current && currentProject.updatedAt < lastHostVersionRef.current) return;

        if (projectChangeTimerRef.current) {
            clearTimeout(projectChangeTimerRef.current);
        }
        projectChangeTimerRef.current = setTimeout(() => {
            projectChangeTimerRef.current = null;
            if (currentProject.updatedAt === lastEmittedVersionRef.current) return;
            if (lastHostVersionRef.current && currentProject.updatedAt < lastHostVersionRef.current) return;
            lastEmittedVersionRef.current = currentProject.updatedAt;
            onProjectChangeRef.current?.(currentProject);
        }, 350);

        return () => {
            if (!projectChangeTimerRef.current) return;
            clearTimeout(projectChangeTimerRef.current);
            projectChangeTimerRef.current = null;
        };
    }, [currentProject, ready]);

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
                                    <Route path="/canvas/:id" element={<CanvasPage embedded hostManagedGeneration={hostManagedGeneration} externalProjectRevision={canvasRevision} onGenerateNode={onGenerateNode} />} />
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
