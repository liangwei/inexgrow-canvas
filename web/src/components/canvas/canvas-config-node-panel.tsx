import type { CSSProperties } from "react";
import { Image as ImageIcon, LoaderCircle, MessageSquare, Music2, Play, Settings2, Square, Video } from "lucide-react";
import { Button, Segmented } from "antd";

import { ModelPicker } from "@/components/model-picker";
import { defaultConfig, resolveModelForCapability, useConfigStore, useEffectiveConfig, type AiConfig } from "@/stores/use-config-store";
import { canvasThemes } from "@/lib/canvas-theme";
import { useThemeStore } from "@/stores/use-theme-store";
import { CanvasImageSettingsPopover } from "./canvas-image-settings-popover";
import { CanvasAudioSettingsPopover, type CanvasAudioSettingKey } from "./canvas-audio-settings-popover";
import { CanvasVideoSettingsPopover } from "./canvas-video-settings-popover";
import { CanvasTextSettingsPopover } from "./canvas-text-settings-popover";
import type { CanvasGenerationMode, CanvasNodeData, CanvasNodeMetadata } from "@/types/canvas";

type CanvasConfigNodePanelProps = {
    node: CanvasNodeData;
    isRunning: boolean;
    hostManagedGeneration?: boolean;
    inputSummary: { textCount: number; imageCount: number; videoCount: number; audioCount: number };
    onConfigChange: (nodeId: string, patch: Partial<CanvasNodeMetadata>) => void;
    onGenerate: (nodeId: string) => void;
    onStop: (nodeId: string) => void;
    onComposerToggle: () => void;
};

export function CanvasConfigNodePanel({ node, isRunning, hostManagedGeneration = false, inputSummary, onConfigChange, onGenerate, onStop, onComposerToggle }: CanvasConfigNodePanelProps) {
    const globalConfig = useEffectiveConfig();
    const openConfigDialog = useConfigStore((state) => state.openConfigDialog);
    const theme = canvasThemes[useThemeStore((state) => state.theme)];
    const mode = hostManagedGeneration ? "video" : node.metadata?.generationMode || "image";
    const config = buildNodeConfig(globalConfig, node, mode);
    const chipStyle = { background: theme.node.fill, borderColor: theme.node.stroke, color: theme.node.text };
    const badgeLabel = String(node.metadata?.badgeLabel || "").trim();
    const badgeTone = node.metadata?.badgeTone || "default";
    const badgeColor = badgeTone === "success" ? "#16a34a" : badgeTone === "warning" ? "#d97706" : badgeTone === "danger" ? "#dc2626" : badgeTone === "info" ? "#2563eb" : theme.node.muted;
    const badgeStyle = { background: `${badgeColor}18`, borderColor: `${badgeColor}66`, color: badgeColor };
    const hasAnyInput = Boolean(inputSummary.textCount || inputSummary.imageCount || inputSummary.videoCount || inputSummary.audioCount);
    const hasComposerContent = Boolean((node.metadata?.composerContent ?? node.metadata?.prompt ?? "").trim());
    const canGenerate = hasComposerContent || (mode === "audio" ? inputSummary.textCount > 0 : hasAnyInput);
    const generationActionLabel = hostManagedGeneration ? String(node.metadata?.generationActionLabel || "").trim() : "";
    const generationDisabled = hostManagedGeneration && node.metadata?.generationDisabled === true;
    const generationDisabledReason = generationDisabled ? String(node.metadata?.generationDisabledReason || "").trim() : "";
    const actionDisabled = !isRunning && (!canGenerate || generationDisabled);

    return (
        <div className={`flex h-full w-full cursor-move flex-col px-3 pb-3 pt-7 text-sm${hostManagedGeneration ? " canvas-director-config-node" : ""}`} style={{ color: theme.node.text }} onWheel={(event) => event.stopPropagation()}>
            <div className="mb-2 flex items-center justify-between gap-3">
                <div className="shrink-0 text-sm font-semibold">{hostManagedGeneration ? "分镜生成" : "生成配置"}</div>
                {hostManagedGeneration ? (
                    <div className="flex shrink-0 items-center gap-1.5">
                        <div className="inline-flex h-7 items-center gap-1 rounded-md border px-2 text-xs" style={chipStyle}>
                            <Video className="size-3.5" />
                            视频
                        </div>
                        {badgeLabel ? (
                            <div className="inline-flex h-7 max-w-[92px] items-center truncate rounded-md border px-2 text-xs" style={badgeStyle} title={badgeLabel}>
                                <span className="truncate">{badgeLabel}</span>
                            </div>
                        ) : null}
                    </div>
                ) : (
                    <div className="cursor-default" onMouseDown={(event) => event.stopPropagation()}>
                        <Segmented
                            size="small"
                            className="canvas-config-mode !rounded-md !p-0.5"
                            value={mode}
                            onChange={(value) => onConfigChange(node.id, { generationMode: value as CanvasGenerationMode })}
                            options={[
                                {
                                    value: "image",
                                    label: (
                                        <span className="inline-flex items-center gap-1">
                                            <ImageIcon className="size-3.5" />
                                            生图
                                        </span>
                                    ),
                                },
                                {
                                    value: "text",
                                    label: (
                                        <span className="inline-flex items-center gap-1">
                                            <MessageSquare className="size-3.5" />
                                            文本
                                        </span>
                                    ),
                                },
                                {
                                    value: "video",
                                    label: (
                                        <span className="inline-flex items-center gap-1">
                                            <Video className="size-3.5" />
                                            视频
                                        </span>
                                    ),
                                },
                                {
                                    value: "audio",
                                    label: (
                                        <span className="inline-flex items-center gap-1">
                                            <Music2 className="size-3.5" />
                                            音频
                                        </span>
                                    ),
                                },
                            ]}
                        />
                    </div>
                )}
            </div>

            <div className="mb-2 flex flex-wrap gap-1.5">
                <InputChip label="提示词" value={`${inputSummary.textCount} 个`} style={chipStyle} />
                <InputChip label="参考图" value={`${inputSummary.imageCount} 张`} style={chipStyle} />
                <InputChip label="参考视频" value={`${inputSummary.videoCount} 个`} style={chipStyle} />
                <InputChip label="参考音频" value={`${inputSummary.audioCount} 个`} style={chipStyle} />
                <button type="button" className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md border px-2 text-[11px]" style={chipStyle} onMouseDown={(event) => event.stopPropagation()} onClick={onComposerToggle}>
                    <Settings2 className="size-3.5" />
                    {hostManagedGeneration ? "编辑分镜策划" : "组装提示词"}
                </button>
            </div>

            {hostManagedGeneration ? (
                <div className="mb-2 flex h-10 items-center rounded-lg border px-3 text-xs" style={chipStyle}>
                    生成参数沿用导演项目设置
                </div>
            ) : (
                <div className="mb-2 grid min-w-0 cursor-default grid-cols-[minmax(0,1fr)_148px] items-center gap-2" onMouseDown={(event) => event.stopPropagation()}>
                    <ModelPicker className="canvas-compact-control h-10" config={config} value={config.model} onChange={(model) => onConfigChange(node.id, { model })} capability={mode} onMissingConfig={() => openConfigDialog(true)} fullWidth />
                    {mode === "video" ? (
                        <CanvasVideoSettingsPopover
                            config={config}
                            placement="topRight"
                            buttonClassName="canvas-compact-control !h-10 !w-full !justify-start !rounded-lg !px-2"
                            onConfigChange={(key, value) => onConfigChange(node.id, videoConfigPatch(key, value))}
                        />
                    ) : mode === "image" ? (
                        <CanvasImageSettingsPopover
                            config={config}
                            placement="topRight"
                            autoAdjustOverflow={false}
                            buttonClassName="canvas-compact-control !h-10 !w-full !justify-start !rounded-lg !px-2"
                            onConfigChange={(key, value) => onConfigChange(node.id, key === "count" ? { count: Number(value) || 1 } : { [key]: value })}
                        />
                    ) : mode === "audio" ? (
                        <CanvasAudioSettingsPopover
                            config={config}
                            placement="topRight"
                            buttonClassName="canvas-compact-control !h-10 !w-full !justify-start !rounded-lg !px-2"
                            onConfigChange={(key, value) => onConfigChange(node.id, audioConfigPatch(key, value))}
                        />
                    ) : (
                        <CanvasTextSettingsPopover
                            config={config}
                            placement="topRight"
                            buttonClassName="canvas-compact-control !h-10 !w-full !justify-start !rounded-lg !px-2"
                            onConfigChange={(_, value) => onConfigChange(node.id, { reasoningEffort: value })}
                        />
                    )}
                </div>
            )}

            <Button
                type="primary"
                className={`mt-auto !h-9 !w-full !rounded-lg${actionDisabled ? " !cursor-not-allowed" : " !cursor-pointer"}${hostManagedGeneration ? " canvas-director-generate-button" : ""}`}
                danger={isRunning}
                disabled={actionDisabled}
                title={!isRunning ? generationDisabledReason || undefined : undefined}
                onMouseDown={(event) => event.stopPropagation()}
                onClick={() => (isRunning ? onStop(node.id) : onGenerate(node.id))}
            >
                <span className="inline-flex items-center gap-1.5">
                    {isRunning ? (
                        <>
                            <LoaderCircle className="size-4 animate-spin" />
                            <Square className="size-3.5 fill-current" />
                            <span>停止</span>
                        </>
                    ) : (
                        <>
                            <Play className="size-4" />
                            <span>{generationActionLabel || "开始生成"}</span>
                        </>
                    )}
                </span>
            </Button>
        </div>
    );
}

function InputChip({ label, value, style }: { label: string; value: string; style: CSSProperties }) {
    return (
        <div className="inline-flex h-7 items-center gap-1 rounded-md border px-2 text-[11px]" style={style}>
            <span>{label}</span>
            <span className="font-medium">{value}</span>
        </div>
    );
}

function buildNodeConfig(globalConfig: AiConfig, node: CanvasNodeData, mode: CanvasGenerationMode): AiConfig {
    return {
        ...globalConfig,
        model: resolveModelForCapability(globalConfig, node.metadata?.model, mode),
        reasoningEffort: node.metadata?.reasoningEffort || globalConfig.reasoningEffort || defaultConfig.reasoningEffort,
        quality: node.metadata?.quality || globalConfig.quality || defaultConfig.quality,
        size: node.metadata?.size || globalConfig.size || defaultConfig.size,
        background: node.metadata?.background ?? globalConfig.background ?? defaultConfig.background,
        videoSeconds: node.metadata?.seconds || globalConfig.videoSeconds || defaultConfig.videoSeconds,
        vquality: node.metadata?.vquality || globalConfig.vquality || defaultConfig.vquality,
        videoGenerateAudio: node.metadata?.generateAudio || globalConfig.videoGenerateAudio || defaultConfig.videoGenerateAudio,
        videoWatermark: node.metadata?.watermark || globalConfig.videoWatermark || defaultConfig.videoWatermark,
        audioVoice: node.metadata?.audioVoice || globalConfig.audioVoice || defaultConfig.audioVoice,
        audioFormat: node.metadata?.audioFormat || globalConfig.audioFormat || defaultConfig.audioFormat,
        audioSpeed: node.metadata?.audioSpeed || globalConfig.audioSpeed || defaultConfig.audioSpeed,
        audioInstructions: node.metadata?.audioInstructions || globalConfig.audioInstructions || defaultConfig.audioInstructions,
        count: String(node.metadata?.count || (mode === "image" ? globalConfig.canvasImageCount || globalConfig.count : globalConfig.count) || defaultConfig.count),
    };
}

function videoConfigPatch(key: keyof AiConfig, value: string) {
    if (key === "videoSeconds") return { seconds: value };
    if (key === "videoGenerateAudio") return { generateAudio: value };
    if (key === "videoWatermark") return { watermark: value };
    return { [key]: value };
}

function audioConfigPatch(key: CanvasAudioSettingKey, value: string) {
    if (key === "audioVoice") return { audioVoice: value };
    if (key === "audioFormat") return { audioFormat: value };
    if (key === "audioSpeed") return { audioSpeed: value };
    return { audioInstructions: value };
}
