import InlineCode from '@/components/InlineCode';
import { txToast } from '@/components/TxToaster';
import { Button } from '@/components/ui/button';
import { useOpenPromptDialog } from '@/hooks/dialogs';
import { useCloseAllSheets } from '@/hooks/sheets';
import { useGlobalStatus } from '@/hooks/status';
import { useBackendApi } from '@/hooks/fetch';
import { cn } from '@/lib/utils';
import { msToDuration } from '@/lib/dateTime';
import { PenLineIcon, PlayCircleIcon, PlusCircleIcon, XCircleIcon } from 'lucide-react';
import { useAdminPerms } from '@/hooks/auth';

//Prompt props
const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
const timezoneDiffMessage = (
    <p className='text-destructive'>
        Serverens tidszone: <b>{window.txConsts.serverTimezone}</b> <br />
        Din tidszone: <b>{browserTimezone}</b> <br />
        Enten brug relative tider, eller bekræft at skemaet bruger serverens tidszone.
    </p>
)
const promptCommonProps = {
    suggestions: ['+5', '+10', '+15', '+30'],
    title: 'Hvornår skal serveren genstarte?',
    message: (<>
        <p>
            Mulige formater: <br />
            <ul className='list-disc ml-4'>
                <li>
                    <InlineCode>+MM</InlineCode> relativ tid i minutter
                    (Eksempel: <InlineCode>+15</InlineCode> for 15 minutter fra nu.)
                </li>
                <li>
                    <InlineCode>HH:MM</InlineCode> Absolut 24-timers ur
                    (Eksempel: <InlineCode>23:30</InlineCode> for 11:30 PM.)
                </li>
            </ul>
        </p>
        {browserTimezone !== window.txConsts.serverTimezone && timezoneDiffMessage}
    </>),
    placeholder: '+15',
    required: true,
    isWide: true,
};

//Validate schedule time input for 24h format or relative time
const validateSchedule = (input: string) => {
    if (input.startsWith('+')) {
        const minutes = parseInt(input.substring(1));
        if (isNaN(minutes) || minutes < 1 || minutes >= 1440) {
            return false;
        }
    } else {
        const [hours, minutes] = input.split(':', 2).map(x => parseInt(x));
        if (
            typeof hours === 'undefined' || isNaN(hours) || hours < 0 || hours > 23
            || typeof minutes === 'undefined' || isNaN(minutes) || minutes < 0 || minutes > 59
        ) {
            return false;
        }
    }
    return true;
}


export default function ServerSchedule() {
    const closeAllSheets = useCloseAllSheets();
    const openPromptDialog = useOpenPromptDialog();
    const { hasPerm } = useAdminPerms();
    const schedulerApi = useBackendApi({
        method: 'POST',
        path: '/fxserver/schedule'
    });

    const globalStatus = useGlobalStatus();
    if (!globalStatus) {
        return <div>
            <h2 className="mb-1 text-lg font-semibold tracking-tight">
                Næste genstart:
            </h2>
            <span className='font-light text-muted-foreground italic'>indlæser...</span>
        </div>
    }

    //Processing status
    const { scheduler } = globalStatus;
    let nextScheduledText = 'Intet planlagt';
    let nextScheduledClasses = 'text-muted-foreground italic';
    let disableAddEditBtn = false;
    let showCancelBtn = false;
    let showEnableBtn = false;
    const hasScheduledRestart = typeof scheduler.nextRelativeMs === 'number';
    if (hasScheduledRestart) {
        const tempFlag = (scheduler.nextIsTemp) ? '(temp)' : '';
        const relativeTime = msToDuration(scheduler.nextRelativeMs, { units: ['h', 'm'] });
        const isLessThanMinute = scheduler.nextRelativeMs < 60_000;
        if (isLessThanMinute) {
            disableAddEditBtn = true;
            nextScheduledText = `lige nu ${tempFlag}`;
        } else {
            nextScheduledText = `om ${relativeTime} ${tempFlag}`;
        }

        if (scheduler.nextSkip) {
            nextScheduledClasses = 'text-muted-foreground line-through';
            if (!isLessThanMinute) {
                showEnableBtn = true;
            }
        } else {
            nextScheduledClasses = 'text-warning-inline';
            if (!isLessThanMinute) {
                showCancelBtn = true;
            }
        }
    }


    //Handlers
    const onScheduleSubmit = (input: string) => {
        closeAllSheets();
        if (input.includes(',')) {
            txToast.error({
                title: 'Ugyldigt tid for planlæggelse af genstart.',
                msg: 'Der ser ud til du prøver at planlægge op til flere forskllige genstart, dette skal gøres inde i Indstillingerne.\nDette input felt er bare for det næste genstart (Ikke vedvarende) .',
            }, { duration: 10000 });
            return;
        }
        if (!validateSchedule(input)) {
            txToast.error(`Ugyldig tid for planlægning: ${input}`)
            return;
        }
        schedulerApi({
            data: { action: 'setNextTempSchedule', parameter: input },
            toastLoadingMessage: 'Planlægger næste server genstart...',
        });
    }
    const handleEdit = () => {
        openPromptDialog({
            ...promptCommonProps,
            onSubmit: onScheduleSubmit,
            submitLabel: 'Rediger',
        });
    }
    const handleAddSchedule = () => {
        openPromptDialog({
            ...promptCommonProps,
            onSubmit: onScheduleSubmit,
            submitLabel: 'Planlæg',
        });
    }
    const handleCancel = () => {
        closeAllSheets();
        schedulerApi({
            data: { action: 'setNextSkip', parameter: true },
            toastLoadingMessage: 'Annullerer næste servergenstart...',
        });
    }
    const handleEnable = () => {
        closeAllSheets();
        schedulerApi({
            data: { action: 'setNextSkip', parameter: false },
            toastLoadingMessage: 'Aktivérer næste servergenstart...',
        });
    }

    const hasSchedulePerms = hasPerm('control.server');

    return <div>
        <h2 className="mb-1 text-lg font-semibold tracking-tight">
            Næste Genstart:
        </h2>
        <span className={cn('font-light', nextScheduledClasses)}>{nextScheduledText}</span>
        <div className='flex flex-row justify-between gap-2 mt-2 flex-wrap'>
            {hasScheduledRestart ? (
                <Button
                    size='xs'
                    variant='ghost'
                    className='flex-grow bg-muted border shadow'
                    disabled={!hasSchedulePerms || disableAddEditBtn}
                    onClick={handleEdit}
                >
                    <PenLineIcon className='h-4 w-4 mr-1' /> Rediger
                </Button>
            ) : (
                <Button
                    size='xs'
                    variant='ghost'
                    className='flex-grow bg-muted border shadow'
                    disabled={!hasSchedulePerms || disableAddEditBtn}
                    onClick={handleAddSchedule}
                >
                    <PlusCircleIcon className='h-4 w-4 mr-1' /> Planlæg Genstart
                </Button>
            )}
            {showCancelBtn && (
                <Button
                    size='xs'
                    variant='ghost'
                    className='flex-grow bg-muted border shadow'
                    onClick={handleCancel}
                    disabled={!hasSchedulePerms}
                >
                    <XCircleIcon className='h-4 w-4 mr-1' /> Annuller
                </Button>
            )}
            {showEnableBtn && (
                <Button
                    size='xs'
                    variant='ghost'
                    className='flex-grow bg-muted border'
                    onClick={handleEnable}
                    disabled={!hasSchedulePerms}
                >
                    <PlayCircleIcon className='h-4 w-4 mr-1' /> Aktiver
                </Button>
            )}
        </div>
    </div>
}
