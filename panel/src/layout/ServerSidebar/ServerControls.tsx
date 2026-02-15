import { KickAllIcon } from '@/components/KickIcons';
import { fxRunnerStateAtom, txConfigStateAtom } from '@/hooks/status';
import { cn } from '@/lib/utils';
import { cva } from 'class-variance-authority';
import { useAtomValue } from 'jotai';
import { MegaphoneIcon, PowerIcon, PowerOffIcon, RotateCcwIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useOpenConfirmDialog, useOpenPromptDialog } from '@/hooks/dialogs';
import { ApiTimeout, useBackendApi } from '@/hooks/fetch';
import { useCloseAllSheets } from '@/hooks/sheets';
import { useAdminPerms } from '@/hooks/auth';
import { TxConfigState } from '@shared/enums';


const controlButtonsVariants = cva(
    `h-10 sm:h-8 rounded-md transition-colors
    flex flex-grow items-center justify-center flex-shrink-0
    border bg-muted shadow-sm

    focus:outline-none disabled:opacity-50 ring-offset-background  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`,
    {
        variants: {
            type: {
                default: "hover:bg-primary hover:text-primary-foreground hover:border-primary",
                destructive: "hover:bg-destructive hover:text-destructive-foreground hover:border-destructive",
                warning: "hover:bg-warning hover:text-warning-foreground hover:border-warning",
                success: "hover:bg-success hover:text-success-foreground hover:border-success",
                info: "hover:bg-info hover:text-info-foreground hover:border-info",
            },
        },
        defaultVariants: {
            type: "default",
        },
    }
);

export default function ServerControls() {
    const txConfigState = useAtomValue(txConfigStateAtom);
    const fxRunnerState = useAtomValue(fxRunnerStateAtom);
    const openConfirmDialog = useOpenConfirmDialog();
    const openPromptDialog = useOpenPromptDialog();
    const closeAllSheets = useCloseAllSheets();
    const { hasPerm } = useAdminPerms();
    const fxsControlApi = useBackendApi({
        method: 'POST',
        path: '/fxserver/controls'
    });
    const fxsCommandsApi = useBackendApi({
        method: 'POST',
        path: '/fxserver/commands'
    });

    const handleServerControl = (action: 'start' | 'stop' | 'restart') => {
        const messageMap = {
            start: 'Starter server',
            stop: 'Stopper server',
            restart: 'Genstarter server',
        }
        const toastLoadingMessage = `${messageMap[action]}...`;
        const callApi = () => {
            closeAllSheets();
            fxsControlApi({
                data: { action },
                toastLoadingMessage,
                timeout: ApiTimeout.LONG,
            });
        }
        if (action === 'start') {
            callApi();
        } else {
            openConfirmDialog({
                title: messageMap[action],
                message: `Er du sikker på du vil ${action} serveren?`,
                onConfirm: callApi,
            });
        }
    }
    const handleStartStop = () => {
        handleServerControl(fxRunnerState.isIdle ? 'start' : 'stop');
    }
    const handleRestart = () => {
        if (!fxRunnerState.isChildAlive) return;
        handleServerControl('restart');
    }

    const handleAnnounce = () => {
        if (!fxRunnerState.isChildAlive) return;
        openPromptDialog({
            title: 'Send meddelelse',
            message: 'Skriv beskeden du gerne ville sende ud til alle spillere.',
            placeholder: 'Meddelelsen',
            submitLabel: 'Send',
            required: true,
            onSubmit: (input) => {
                closeAllSheets();
                fxsCommandsApi({
                    data: { action: 'admin_broadcast', parameter: input },
                    toastLoadingMessage: 'Sending announcement...',
                });
            }
        });
    }

    const handleKickAll = () => {
        if (!fxRunnerState.isChildAlive) return;
        openPromptDialog({
            title: 'Smid alle spillere ud',
            message: 'Skriv grunden for at smide ud eller efterlad tom (tryk enter)',
            placeholder: 'Grunden for at smide ud',
            submitLabel: 'Send',
            onSubmit: (input) => {
                closeAllSheets();
                fxsCommandsApi({
                    data: { action: 'kick_all', parameter: input },
                    toastLoadingMessage: 'Smider alle spillere ud...',
                });
            }
        });
    }

    const hasControlPerms = hasPerm('control.server');
    const hasAnnouncementPerm = hasPerm('announcement');

    if (txConfigState !== TxConfigState.Ready) {
        return (
            <div className='w-full h-8 text-center tracking-wider font-light opacity-75'>
                Serveren er ikke konfigureret.
            </div>
        )
    }
    return (
        <div className="flex flex-row justify-between gap-2">
            <Tooltip>
                <TooltipTrigger asChild>
                    {fxRunnerState.isIdle ? (
                        <div className="relative flex flex-grow inset-0">
                            <div className='absolute inset-0 bg-success animate-pulse rounded blur-sm'></div>
                            <button
                                onClick={handleStartStop}
                                className={cn(controlButtonsVariants({ type: 'success' }), 'relative')}
                                disabled={!hasControlPerms}
                            >
                                <PowerIcon className='h-5' />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={handleStartStop}
                            className={controlButtonsVariants({ type: 'destructive' })}
                            disabled={!hasControlPerms}
                        >
                            <PowerOffIcon className='h-5' />
                        </button>
                    )}
                </TooltipTrigger>
                <TooltipContent className={cn(!hasControlPerms && 'text-destructive-inline text-center')}>
                    {hasControlPerms ? (
                        <p>{fxRunnerState.isIdle ? 'Start serveren! 🚀' : 'Stop serveren'}</p>
                    ) : (
                        <p>
                            Du har ikke tilladelse <br />
                            til at kontrollere serveren.
                        </p>
                    )}
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={handleRestart}
                        className={cn(controlButtonsVariants({ type: 'warning' }))}
                        disabled={!hasControlPerms || !fxRunnerState.isChildAlive}
                    >
                        <RotateCcwIcon className='h-5' />
                    </button>
                </TooltipTrigger>
                <TooltipContent className={cn(!hasControlPerms && 'text-destructive-inline text-center')}>
                    {hasControlPerms ? (
                        <p>Genstart Serveren</p>
                    ) : (
                        <p>
                            Du har ikke tilladelse <br />
                            til at kontrollere serveren.
                        </p>
                    )}
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={handleKickAll}
                        className={controlButtonsVariants()}
                        disabled={!hasControlPerms || !fxRunnerState.isChildAlive}
                    >
                        <KickAllIcon style={{ height: '1.25rem', width: '1.5rem', fill: 'currentcolor' }} />
                    </button>
                </TooltipTrigger>
                <TooltipContent className={cn(!hasControlPerms && 'text-destructive-inline text-center')}>
                    {hasControlPerms ? (
                        <p>Smid alle spillere ud</p>
                    ) : (
                        <p>
                            Du har ikke tilladelse <br />
                            til at kontrollere serveren.
                        </p>
                    )}
                </TooltipContent>
            </Tooltip>
            <Tooltip>
                <TooltipTrigger asChild>
                    <button
                        onClick={handleAnnounce}
                        className={controlButtonsVariants()}
                        disabled={!hasAnnouncementPerm || !fxRunnerState.isChildAlive}
                    >
                        <MegaphoneIcon className='h-5' />
                    </button>
                </TooltipTrigger>
                <TooltipContent className={cn(!hasAnnouncementPerm && 'text-destructive-inline text-center')}>
                    {hasAnnouncementPerm ? (
                        <p>Send Meddelelse</p>
                    ) : (
                        <p>
                            Du har ikke tilladelse <br />
                            til at sende en meddelelse.
                        </p>
                    )}
                </TooltipContent>
            </Tooltip>
        </div>
    );
}
