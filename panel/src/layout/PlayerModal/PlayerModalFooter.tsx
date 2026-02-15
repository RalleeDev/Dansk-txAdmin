import { DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PlayerModalRefType, useClosePlayerModal } from "@/hooks/playerModal";
import { AlertTriangleIcon, MailIcon, ShieldCheckIcon } from "lucide-react";
import { KickOneIcon } from '@/components/KickIcons';
import { useBackendApi } from "@/hooks/fetch";
import { useAdminPerms } from "@/hooks/auth";
import { useOpenPromptDialog } from "@/hooks/dialogs";
import { GenericApiOkResp } from "@shared/genericApiTypes";
import { PlayerModalPlayerData } from "@shared/playerApiTypes";
import { useLocation, useRoute } from "wouter";
import { useContentRefresh } from "@/hooks/pages";
import { useCloseAllSheets } from "@/hooks/sheets";


type PlayerModalFooterProps = {
    playerRef: PlayerModalRefType,
    player?: PlayerModalPlayerData,
}

export default function PlayerModalFooter({ playerRef, player }: PlayerModalFooterProps) {
    const { hasPerm } = useAdminPerms();
    const openPromptDialog = useOpenPromptDialog();
    const closeModal = useClosePlayerModal();
    const setLocation = useLocation()[1];
    const [isAlreadyInAdminPage] = useRoute('/admins');
    const refreshContent = useContentRefresh();
    const closeAllSheets = useCloseAllSheets();
    const playerMessageApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: `/player/message`,
    });
    const playerKickApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: `/player/kick`,
    });
    const playerWarnApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: `/player/warn`,
    });

    const closeOnSuccess = (data: GenericApiOkResp) => {
        if ('success' in data) {
            closeModal();
            closeAllSheets();
        }
    }

    const handleGiveAdmin = () => {
        if (!player) return;
        const params = new URLSearchParams();
        params.set("autofill", "true");
        params.set("name", player.pureName);
        for (const id of player.ids) {
            if (id.startsWith("discord:")) {
                params.set("discord", id);
            } else if (id.startsWith("fivem:")) {
                params.set("citizenfx", id);
            }
        }
        setLocation(`/admins?${params.toString()}`);
        console.log('isAlreadyInAdminPage', isAlreadyInAdminPage);
        if (isAlreadyInAdminPage) {
            refreshContent();
        }
        closeModal();
        closeAllSheets();
    }

    const handleDm = () => {
        if (!player) return;
        openPromptDialog({
            title: `Direkte besked til ${player.displayName}`,
            message: 'Skriv beskeden nedenunder',
            placeholder: 'Hvad end du vil sige',
            submitLabel: 'Send',
            required: true,
            onSubmit: (input) => {
                playerMessageApi({
                    queryParams: playerRef,
                    data: { message: input },
                    genericHandler: { successMsg: 'Direkte besked sendt.' },
                    toastLoadingMessage: 'Sender direkte besked...',
                    success: closeOnSuccess,
                });
            }
        });
    }

    const handleKick = () => {
        if (!player) return;
        openPromptDialog({
            title: `Smid ${player.displayName} ud`,
            message: 'Skriv begrundelsen eller efterlad tom (tryk enter)',
            placeholder: 'enhver grund du ønsker',
            submitLabel: 'Smid ud',
            onSubmit: (input) => {
                playerKickApi({
                    queryParams: playerRef,
                    data: { reason: input },
                    genericHandler: { successMsg: 'Spiller smidt ud.' },
                    toastLoadingMessage: 'Smider spiller ud...',
                    success: closeOnSuccess,
                });
            }
        });
    }

    const handleWarn = () => {
        if (!player) return;
        openPromptDialog({
            title: `Advar ${player.displayName}`,
            message: <p>
                Skriv din begrundelse nedenunder. <br />
                Offline spillere ville modtage advarslen når de forbinder igen.
            </p>,
            placeholder: 'Begrundelsen for advarslen, brudt en regel, osv.',
            submitLabel: 'Advar',
            required: true,
            onSubmit: (input) => {
                playerWarnApi({
                    queryParams: playerRef,
                    data: { reason: input },
                    genericHandler: { successMsg: 'Advarsel sendt.' },
                    toastLoadingMessage: 'Sender Advarsel...',
                    success: closeOnSuccess,
                });
            }
        });
    }

    return (
        <DialogFooter className="max-w-2xl gap-2 p-2 md:p-4 border-t grid grid-cols-2 sm:flex">
            <Button
                variant='outline'
                size='sm'
                disabled={!hasPerm('manage.admins') || !player || !player.ids.length}
                onClick={handleGiveAdmin}
                className="pl-2 sm:mr-auto"
            >
                <ShieldCheckIcon className="h-5 mr-1" /> Giv Admin
            </Button>
            <Button
                variant='outline'
                size='sm'
                disabled={!hasPerm('players.direct_message') || !player || !player.isConnected}
                onClick={handleDm}
                className="pl-2"
            >
                <MailIcon className="h-5 mr-1" /> DM
            </Button>
            <Button
                variant='outline'
                size='sm'
                disabled={!hasPerm('players.kick') || !player || !player.isConnected}
                onClick={handleKick}
                className="pl-2"
            >
                <KickOneIcon style={{
                    height: '1.25rem',
                    width: '1.75rem',
                    marginRight: '0.25rem',
                    fill: 'currentcolor'
                }} /> Smid ud
            </Button>
            <Button
                variant='outline'
                size='sm'
                disabled={!hasPerm('players.warn') || !player}
                onClick={handleWarn}
                className="pl-2"
            >
                <AlertTriangleIcon className="h-5 mr-1" /> Advar
            </Button>
        </DialogFooter>
    )
}
