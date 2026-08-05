import type { CSSProperties, ReactElement } from "react";

export type ThemeName = "light" | "dark";
export type InexgrowCanvasTheme = ThemeName;
export type CanvasBackgroundMode = "dots" | "grid" | "lines" | "blank";
export type ViewportTransform = { x: number; y: number; k: number };
export type CanvasNodeTypeId = "image" | "text" | "config" | "video" | "audio" | "group" | (string & {});

export declare const CanvasNodeType: {
    readonly Image: "image";
    readonly Text: "text";
    readonly Config: "config";
    readonly Video: "video";
    readonly Audio: "audio";
    readonly Group: "group";
};

export type CanvasNodeMetadata = {
    content?: string;
    composerContent?: string;
    prompt?: string;
    status?: "idle" | "success" | "loading" | "error";
    errorDetails?: string;
    fontSize?: number;
    generationMode?: "text" | "image" | "video" | "audio";
    generationType?: "generation" | "edit";
    model?: string;
    size?: string;
    count?: number;
    seconds?: string;
    references?: string[];
    naturalWidth?: number;
    naturalHeight?: number;
    freeResize?: boolean;
    storageKey?: string;
    mimeType?: string;
    bytes?: number;
    durationMs?: number;
    groupId?: string;
    [key: string]: unknown;
};

export type CanvasNodeData = {
    id: string;
    type: CanvasNodeTypeId;
    title: string;
    position: { x: number; y: number };
    width: number;
    height: number;
    metadata?: CanvasNodeMetadata;
};

export type CanvasConnection = {
    id: string;
    fromNodeId: string;
    toNodeId: string;
};

export type CanvasAssistantSession = {
    id: string;
    title: string;
    messages: unknown[];
    createdAt: string;
    updatedAt: string;
};

export type CanvasProject = {
    id: string;
    title: string;
    createdAt: string;
    updatedAt: string;
    nodes: CanvasNodeData[];
    connections: CanvasConnection[];
    chatSessions: CanvasAssistantSession[];
    activeChatId: string | null;
    backgroundMode: CanvasBackgroundMode;
    showImageInfo: boolean;
    viewport: ViewportTransform;
};

export type InexgrowCanvasProps = {
    project: CanvasProject;
    theme?: ThemeName;
    className?: string;
    style?: CSSProperties;
    onProjectChange?: (project: CanvasProject) => void;
};

export declare function InexgrowCanvas(props: InexgrowCanvasProps): ReactElement;
