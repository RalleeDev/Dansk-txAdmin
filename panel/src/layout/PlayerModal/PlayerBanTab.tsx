import { Button } from "@/components/ui/button";
import { useAdminPerms } from "@/hooks/auth";
import { PlayerModalRefType, useClosePlayerModal } from "@/hooks/playerModal";
import { Loader2Icon } from "lucide-react";
import { useRef, useState } from "react";
import { useBackendApi } from "@/hooks/fetch";
import { GenericApiOkResp } from "@shared/genericApiTypes";
import ModalCentralMessage from "@/components/ModalCentralMessage";
import type { BanTemplatesDataType } from "@shared/otherTypes";
import BanForm, { BanFormType } from "@/components/BanForm";
import { txToast } from "@/components/TxToaster";


type PlayerBanTabProps = {
    banTemplates: BanTemplatesDataType[];
    playerRef: PlayerModalRefType;
};

export default function PlayerBanTab({ playerRef, banTemplates }: PlayerBanTabProps) {
    const banFormRef = useRef<BanFormType>(null);
    const [isSaving, setIsSaving] = useState(false);
    const { hasPerm } = useAdminPerms();
    const closeModal = useClosePlayerModal();
    const playerBanApi = useBackendApi<GenericApiOkResp>({
        method: 'POST',
        path: `/player/ban`,
        throwGenericErrors: true,
    });

    if (!hasPerm('players.ban')) {
        return <ModalCentralMessage>
            Du har ikke tilladelse til at udelukke andre spillere.
        </ModalCentralMessage>;
    }

    const handleSave = () => {
        if (!banFormRef.current) return;
        const { reason, duration } = banFormRef.current.getData();

        if (!reason || reason.length < 3) {
            txToast.warning(`Grunden skal mindt være 3 karakter lang.`);
            banFormRef.current.focusReason();
            return;
        }

        setIsSaving(true);
        playerBanApi({
            queryParams: playerRef,
            data: {reason, duration},
            toastLoadingMessage: 'Udelukker spiller...',
            genericHandler: {
                successMsg: 'Spiller Udelukket.',
            },
            success: (data) => {
                setIsSaving(false);
                closeModal();
            },
            error: (error) => {
                setIsSaving(false);
            }
        });
    };

    return (
        <div className="grid gap-4 p-1">
            <BanForm
                ref={banFormRef}
                banTemplates={banTemplates}
                disabled={isSaving}
                onNavigateAway={() => { closeModal(); }}
            />
            <div className="flex place-content-end">
                <Button
                    size="sm"
                    variant="destructive"
                    disabled={isSaving}
                    onClick={handleSave}
                >
                    {isSaving ? (
                        <span className="flex items-center leading-relaxed">
                            <Loader2Icon className="inline animate-spin h-4" /> Udelukker...
                        </span>
                    ) : 'Anvend Udelukkelse'}
                </Button>
            </div>
        </div>
    );
}
