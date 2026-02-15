import { useState } from "react";
import type { DatabaseActionType } from "../../../../core/modules/Database/databaseTypes";
import { Button } from "@/components/ui/button";
import { GenericApiOkResp } from "@shared/genericApiTypes";
import { useAdminPerms } from "@/hooks/auth";
import { Loader2Icon } from "lucide-react";
import { useBackendApi } from "@/hooks/fetch";
import type { ApiRevokeActionReqSchema } from "../../../../core/routes/history/actions";


type ActionModifyTabProps = {
    action: DatabaseActionType;
    refreshModalData: () => void;
}

export default function ActionModifyTab({ action, refreshModalData }: ActionModifyTabProps) {
    const [isRevoking, setIsRevoking] = useState(false);
    const { hasPerm } = useAdminPerms();
    const revokeActionApi = useBackendApi<GenericApiOkResp, ApiRevokeActionReqSchema>({
        method: 'POST',
        path: `/history/revokeAction`,
    });

    const upperCasedType = action.type.charAt(0).toUpperCase() + action.type.slice(1);
    const doRevokeAction = () => {
        setIsRevoking(true);
        revokeActionApi({
            data: { actionId: action.id },
            toastLoadingMessage: `Ophæver ${action.type}...`,
            genericHandler: {
                successMsg: `${upperCasedType} Ophævet.`,
            },
            success: (data) => {
                setIsRevoking(false);
                if ('success' in data) {
                    refreshModalData();
                }
            },
        });
    }

    const isAlreadyRevoked = !!action.revocation.timestamp;
    const hasRevokePerm = hasPerm(action.type === 'warn' ? 'players.warn' : 'players.ban');
    const revokeBtnLabel = isAlreadyRevoked
        ? `${action.type} ophævet`
        : hasRevokePerm
            ? `Ophøv ${upperCasedType}`
            : 'Ophæv (ingen tilladelse)';
    return (
        <div className="flex flex-col gap-4 px-1 mb-1 md:mb-4">
            <div className="space-y-2">
                <h3 className="text-xl">Ophæv {upperCasedType}</h3>
                <p className="text-muted-foreground text-sm">
                    Dette sker generelt når en spiller får en chance til {action.type} eller administratoren glemmer at fikse.
                    <ul className="list-disc list-inside pt-1">
                        {action.type === 'ban' && <li>Spilleren ville have mulighed for at forbinde igen.</li>}
                        <li>Spilleren vil ikke blive notificeret om ophævningen</li>
                        <li>Denne {action.type} vil ikke blive fjernet fra spillerens historik.</li>
                        <li>Ophævelsen kan ikke refunderes!</li>
                    </ul>
                </p>

                <Button
                    variant="destructive"
                    size='xs'
                    className="col-start-1 col-span-full xs:col-span-3 xs:col-start-2"
                    type="submit"
                    disabled={isAlreadyRevoked || !hasRevokePerm || isRevoking}
                    onClick={doRevokeAction}
                >
                    {isRevoking ? (
                        <span className="flex items-center leading-relaxed">
                            <Loader2Icon className="inline animate-spin h-4" /> Ophæver...
                        </span>
                    ) : revokeBtnLabel}
                </Button>
            </div>
        </div>
    );
}
