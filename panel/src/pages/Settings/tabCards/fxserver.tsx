import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import SwitchText from '@/components/SwitchText'
import InlineCode from '@/components/InlineCode'
import { AdvancedDivider, SettingItem, SettingItemDesc } from '../settingsItems'
import { useState, useEffect, useRef, useMemo, useReducer } from "react"
import { getConfigEmptyState, getConfigAccessors, SettingsCardProps, getPageConfig, configsReducer, getConfigDiff, type PageConfigReducerAction } from "../utils"
import { PlusIcon, TrashIcon, Undo2Icon, XIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { TimeInputDialog } from "@/components/TimeInputDialog"
import TxAnchor from "@/components/TxAnchor"
import { useAutoAnimate } from "@formkit/auto-animate/react"
import SettingsCardShell from "../SettingsCardShell"
import { cn } from "@/lib/utils"
import { txToast } from "@/components/TxToaster"
import { useBackendApi } from "@/hooks/fetch"
import { useAdminPerms } from "@/hooks/auth"
import { useLocation } from "wouter"
import type { ResetServerDataPathResp } from "@shared/otherTypes"
import { useOpenConfirmDialog } from "@/hooks/dialogs"


// Remove duplicates and sort times
function sanitizeTimes(times: string[]): string[] {
    const uniqueTimes = Array.from(new Set(times));
    return uniqueTimes.sort((a, b) => {
        const [aHours, aMinutes] = a.split(':').map(Number);
        const [bHours, bMinutes] = b.split(':').map(Number);
        return aHours - bHours || aMinutes - bMinutes;
    });
}


type RestartScheduleBoxProps = {
    restartTimes: string[] | undefined;
    setRestartTimes: (val: PageConfigReducerAction<string[]|undefined>['configValue']) => void;
    disabled?: boolean;
};

function RestartScheduleBox({ restartTimes, setRestartTimes, disabled }: RestartScheduleBoxProps) {
    const [isTimeInputOpen, setIsTimeInputOpen] = useState(false);
    const [animationParent] = useAutoAnimate();

    const addTime = (time: string) => {
        if (!restartTimes || disabled) return;
        setRestartTimes(prev => sanitizeTimes([...prev ?? [], time]));
    };
    const removeTime = (index: number) => {
        if (!restartTimes || disabled) return;
        setRestartTimes(prev => sanitizeTimes((prev ?? []).filter((_, i) => i !== index)));
    };
    const applyPreset = (presetTimes: string[]) => {
        if (!restartTimes || disabled) return;
        setRestartTimes(presetTimes);
    };
    const clearTimes = () => {
        if (disabled) return;
        setRestartTimes([]);
    };

    const presetSpanClasses = cn(
        'text-muted-foreground',
        disabled && 'opacity-50 cursor-not-allowed'
    )

    return (
        <div className="py-3 px-2 min-h-[4.5rem] flex items-center border rounded-lg">
            <div className={cn("w-full flex items-center gap-2", disabled && 'cursor-not-allowed')}>
                <div className="flex flex-wrap gap-2 grow" ref={animationParent} >
                    {restartTimes && restartTimes.length === 0 && (
                        <div className="text-sm text-muted-foreground">
                            <span>
                                Intet skema indstillet. Klik på <strong>+</strong> knappen for at tilføje en tid.
                            </span>
                            <p>
                                {'Skabeloner: '}
                                <a
                                    onClick={() => applyPreset(['00:00'])}
                                    className="cursor-pointer text-sm text-primary hover:underline"
                                >
                                    1x<span className={presetSpanClasses}>/dag</span>
                                </a>
                                {', '}
                                <a
                                    onClick={() => applyPreset(['00:00', '12:00'])}
                                    className="cursor-pointer text-sm text-primary hover:underline"
                                >
                                    2x<span className={presetSpanClasses}>/dag</span>
                                </a>
                                {', '}
                                <a
                                    onClick={() => applyPreset(['00:00', '08:00', '16:00'])}
                                    className="cursor-pointer text-sm text-primary hover:underline"
                                >
                                    3x<span className={presetSpanClasses}>/dag</span>
                                </a>
                                {', '}
                                <a
                                    onClick={() => applyPreset(['00:00', '06:00', '12:00', '18:00'])}
                                    className="cursor-pointer text-sm text-primary hover:underline"
                                >
                                    4x<span className={presetSpanClasses}>/dag</span>
                                </a>
                            </p>
                        </div>
                    )}
                    {restartTimes && restartTimes.map((time, index) => (
                        <div key={time} className="flex items-center space-x-1 bg-secondary text-secondary-foreground px-3 py-1 rounded-md select-none">
                            <span className="font-mono">{time}</span>
                            {!disabled && <button
                                onClick={() => removeTime(index)}
                                className="ml-2 text-secondary-foreground/50 hover:text-destructive"
                                aria-label="Remove"
                                disabled={disabled}
                            >
                                <XIcon className="size-4" />
                            </button>}
                        </div>
                    ))}
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => setIsTimeInputOpen(true)}
                        variant="secondary"
                        size={'xs'}
                        className="w-10 hover:bg-primary hover:text-primary-foreground"
                        aria-label="Add"
                        disabled={disabled}
                    >
                        <PlusIcon className="h-4" />
                    </Button>
                    <Button
                        onClick={() => clearTimes()}
                        variant="muted"
                        size={'xs'}
                        className="w-10 hover:bg-destructive hover:text-destructive-foreground"
                        aria-label="Clear"
                        disabled={disabled || !restartTimes || restartTimes.length === 0}
                    >
                        <TrashIcon className="h-3.5" />
                    </Button>
                </div>
            </div>
            <TimeInputDialog
                title="Tilføj et tidspunkt til genstart"
                isOpen={isTimeInputOpen}
                onClose={() => setIsTimeInputOpen(false)}
                onSubmit={addTime}
            />
        </div>
    )
}


const getServerDataPlaceholder = (hostSuggested?: string) => {
    if (hostSuggested) {
        const withoutTailSlash = hostSuggested.replace(/\/$/, '');
        return `${withoutTailSlash}/CFXDefault`;
    } else if (window.txConsts.isWindows) {
        return 'C:/Users/Admin/Desktop/CFXDefault';
    } else {
        return '/root/fivem/txData/CFXDefault';
    }
}

// Check if the browser timezone is different from the server timezone
function TimeZoneWarning() {
    try {
        const browserTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (window.txConsts.serverTimezone !== browserTimezone) {
            return (
                <SettingItemDesc className="text-destructive-inline">
                    <strong>Advarsel:</strong> Serverens tidszone er sat til <InlineCode>{window.txConsts.serverTimezone}</InlineCode>, men din browsers er sat til <InlineCode>{browserTimezone}</InlineCode>. Husk at konfigure tiden efter serverens tidszone.
                </SettingItemDesc>
            );
        }
    } catch (error) {
        console.error(error);
    }
    return null;
}


export const pageConfigs = {
    dataPath: getPageConfig('server', 'dataPath'),
    restarterSchedule: getPageConfig('restarter', 'schedule'),
    quietMode: getPageConfig('server', 'quiet'),

    cfgPath: getPageConfig('server', 'cfgPath', true),
    startupArgs: getPageConfig('server', 'startupArgs', true),
    onesync: getPageConfig('server', 'onesync', true),
    autoStart: getPageConfig('server', 'autoStart', true),
    resourceTolerance: getPageConfig('restarter', 'resourceStartingTolerance', true),
} as const;

export default function ConfigCardFxserver({ cardCtx, pageCtx }: SettingsCardProps) {
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [isResettingServerData, setIsResettingServerData] = useState(false);
    const { hasPerm } = useAdminPerms();
    const setLocation = useLocation()[1];
    const openConfirmDialog = useOpenConfirmDialog();
    const [states, dispatch] = useReducer(
        configsReducer<typeof pageConfigs>,
        null,
        () => getConfigEmptyState(pageConfigs),
    );
    const cfg = useMemo(() => {
        return getConfigAccessors(cardCtx.cardId, pageConfigs, pageCtx.apiData, dispatch);
    }, [pageCtx.apiData, dispatch]);

    //Effects - handle changes and reset advanced settings
    useEffect(() => {
        updatePageState();
    }, [states]);
    useEffect(() => {
        if (showAdvanced) return;
        Object.values(cfg).forEach(c => c.isAdvanced && c.state.discard());
    }, [showAdvanced]);

    //Refs for configs that don't use state
    const dataPathRef = useRef<HTMLInputElement | null>(null);
    const cfgPathRef = useRef<HTMLInputElement | null>(null);
    const startupArgsRef = useRef<HTMLInputElement | null>(null);
    const forceQuietMode = pageCtx.apiData?.forceQuietMode;

    //Marshalling Utils
    const selectNumberUtil = {
        toUi: (num?: number) => num ? num.toString() : undefined,
        toCfg: (str?: string) => str ? parseInt(str) : undefined,
    }
    const inputArrayUtil = {
        toUi: (args?: string[]) => args ? args.join(' ') : '',
        toCfg: (str?: string) => str ? str.trim().split(/\s+/) : [],
    }
    const emptyToNull = (str?: string) => {
        if (str === undefined) return undefined;
        const trimmed = str.trim();
        return trimmed.length ? trimmed : null;
    };

    //Processes the state of the page and sets the card as pending save if needed
    const updatePageState = () => {
        let currStartupArgs;
        if (startupArgsRef.current) {
            currStartupArgs = inputArrayUtil.toCfg(startupArgsRef.current.value);
        }
        let currDataPath;
        if (dataPathRef.current?.value) {
            currDataPath = dataPathRef.current.value.replace(/\\/g, '/').replace(/\/\/+/, '/');
            if (currDataPath.endsWith('/')) {
                currDataPath = currDataPath.slice(0, -1);
            }
        }
        const overwrites = {
            dataPath: emptyToNull(dataPathRef.current?.value),
            cfgPath: cfgPathRef.current?.value,
            startupArgs: currStartupArgs,
        };

        const res = getConfigDiff(cfg, states, overwrites, showAdvanced);
        pageCtx.setCardPendingSave(res.hasChanges ? cardCtx : null);
        return res;
    }

    //Validate changes (for UX only) and trigger the save API
    const handleOnSave = () => {
        const { hasChanges, localConfigs } = updatePageState();
        if (!hasChanges) return;

        if (!localConfigs.server?.dataPath) {
            return txToast.error({
                title: 'Mappen med server data er påkrævet.',
                md: true,
                msg: 'Hvis du ville vende tilbage til opsætningsiden, klik på "Nulstil" knappen istedet.',
            });
        }
        if (localConfigs.server.cfgPath !== undefined && !localConfigs.server.cfgPath) {
            return txToast.error({
                title: 'Stien til CFG filen er påkrævet',
                md: true,
                msg: 'Inputtet skulle meget gerne være `server.cfg`.',
            });
        }
        if (
            Array.isArray(localConfigs.server?.startupArgs)
            && localConfigs.server.startupArgs.some((arg) => arg.toLowerCase() === 'onesync')
        ) {
            return txToast.error({
                title: 'Du kan ikke indstille OneSync i opstarts argumenterne.',
                md: true,
                msg: 'Brug venligst boksen med valgmuligheder nedenunder.',
            });
        }
        pageCtx.saveChanges(cardCtx, localConfigs);
    }

    //Card content stuff
    const serverDataPlaceholder = useMemo(
        () => getServerDataPlaceholder(pageCtx.apiData?.dataPath),
        [pageCtx.apiData]
    );

    //Reset server server data button
    const resetServerDataApi = useBackendApi<ResetServerDataPathResp>({
        method: 'POST',
        path: `/settings/resetServerDataPath`,
        throwGenericErrors: true,
    });
    const handleResetServerData = () => {
        openConfirmDialog({
            title: 'Nulstil Server Data Stien',
            message: (<>
                Er du sikker på du ville nulstille stien til din server data <br />
                <br />
                <strong>Det ville ikke slette nogen ressourcer</strong>,man bare nulstille txAdmin konfigurationer, Så du kan vende tilbage til Opsætningen. <br />
                Hvis du vil, Hvis du ville, kan du sætte stien tilbage til den nuværende værdi senere. <br />
                <br />
                <strong className="text-warning-inline">Advarsel:</strong> Tag en note af den nuværende sti inden du fortsætter, så du kan indstille den tilbage senere hvis du får brug for det. Nuværende sti:
                <Input value={cfg.dataPath.initialValue} className="mt-2" readOnly />
            </>),
            onConfirm: () => {
                setIsResettingServerData(true);
                resetServerDataApi({
                    toastLoadingMessage: 'Nulstiller stien til server dataen...',
                    success: (data, toastId) => {
                        if (data.type === 'success') {
                            setLocation('/server/setup');
                        }
                    },
                    finally: () => setIsResettingServerData(false),
                });
            },
        });

    }

    // cfg.restarterSchedule.state.set(['00:00', '12:00'])
    // cfg.restarterSchedule.state.set([])
    // cfg.restarterSchedule.state.set(undefined)

    return (
        <SettingsCardShell
            cardCtx={cardCtx}
            pageCtx={pageCtx}
            onClickSave={handleOnSave}
            advancedVisible={showAdvanced}
            advancedSetter={setShowAdvanced}
        >
            <SettingItem label="Server Data Mappe" htmlFor={cfg.dataPath.eid} required>
                <div className="flex gap-2">
                    <Input
                        id={cfg.dataPath.eid}
                        ref={dataPathRef}
                        defaultValue={cfg.dataPath.initialValue}
                        placeholder={serverDataPlaceholder}
                        onInput={updatePageState}
                        disabled={pageCtx.isReadOnly}
                        required
                    />
                    <Button
                        className="grow border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                        variant="outline"
                        disabled={pageCtx.isReadOnly || !hasPerm('all_permissions') || isResettingServerData}
                        onClick={handleResetServerData}
                    >
                        <Undo2Icon className="mr-2 h-4 w-4" /> Nulstil
                    </Button>
                </div>
                <SettingItemDesc>
                    Den fulde sti til mappen der <strong>indeholder</strong> dine <InlineCode>resources</InlineCode> mappe, Det er ofte det samme sted der indeholder din <InlineCode>server.cfg</InlineCode>. <br />
                    Nulstilning af denne værdi vil smide dig tilbage til Opsætnings siden, uden at slette nogle filer.
                    {pageCtx.apiData?.dataPath && pageCtx.apiData?.hasCustomDataPath && (<>
                        <br />
                        <span className="text-warning-inline">
                            {window.txConsts.hostConfigSource}: Denne sti burde starte med <InlineCode>{pageCtx.apiData.dataPath}</InlineCode> .
                        </span>
                    </>)}
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Tidsplan for genstart" showOptional>
                <RestartScheduleBox
                    restartTimes={states.restarterSchedule}
                    setRestartTimes={cfg.restarterSchedule.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <TimeZoneWarning />
                <SettingItemDesc>
                    På hvilket tidspunkt om dagen skal serveren genstarte. <br />
                    <strong>Note:</strong> Sørg for skemaet matcher din servers tidzone og ikke din lokale tid.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Stille tilstand">
                <SwitchText
                    id={cfg.quietMode.eid}
                    checkedLabel="Aktiveret"
                    uncheckedLabel="Deaktiveret"
                    checked={forceQuietMode || states.quietMode}
                    onCheckedChange={cfg.quietMode.state.set}
                    disabled={pageCtx.isReadOnly || forceQuietMode}
                />
                <SettingItemDesc>
                    Vis ikke FXServer's output i terminalen. <br />
                    Du vil stadig være i stand til at bruge Live Konsollen.
                    {forceQuietMode && (<>
                        <br />
                        <span className="text-warning-inline">{window.txConsts.hostConfigSource}: Denne indstilling er låst og kan ikke ændres.</span>
                    </>)}
                </SettingItemDesc>
            </SettingItem>

            {showAdvanced && <AdvancedDivider />}

            <SettingItem label="CFG fil sti" htmlFor={cfg.cfgPath.eid} showIf={showAdvanced} required>
                <Input
                    id={cfg.cfgPath.eid}
                    ref={cfgPathRef}
                    defaultValue={cfg.cfgPath.initialValue}
                    placeholder="server.cfg"
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                    required
                />
                <SettingItemDesc>
                    Stien til din server konfigurations fil, sandsynligvis kaldet <InlineCode>server.cfg</InlineCode>. <br />
                    Dette kan enten være absolut eller relativt i forhold til mappen med server data..
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Opstarts argumenter" htmlFor={cfg.startupArgs.eid} showIf={showAdvanced}>
                <Input
                    id={cfg.startupArgs.eid}
                    ref={startupArgsRef}
                    defaultValue={inputArrayUtil.toUi(cfg.startupArgs.initialValue)}
                    placeholder="--trace-warning"
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Yderligere kommandolinjeargumenter der skal videregives til FXServer instansen så som NodeJS CLI-flag. <br />
                    <strong>Advarsel:</strong> Du bør næsten helt sikkert ikke bruge denne indstilling, kommandoer og convars burde placeres i din <InlineCode>server.cfg</InlineCode> istedet.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="OneSync" htmlFor={cfg.onesync.eid} showIf={showAdvanced}>
                <Select
                    value={states.onesync}
                    onValueChange={cfg.onesync.state.set as any}
                    disabled={pageCtx.isReadOnly}
                >
                    <SelectTrigger id={cfg.onesync.eid}>
                        <SelectValue placeholder="Vælg en OneSync idnstilling" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="on">Aktiveret (anbefalet)</SelectItem>
                        <SelectItem value="legacy">Legacy</SelectItem>
                        <SelectItem value="off">Deaktiveret</SelectItem>
                    </SelectContent>
                </Select>
                <SettingItemDesc>
                    De fleste servere burde have <strong>Aktiveret OneSync</strong>. <br />
                    De andre muligheder betragtes som deprecated og bør ikke bruges, medmindre du ved, hvad du gør.
                    for mere information, Læs venligst <TxAnchor href="https://docs.fivem.net/docs/scripting-reference/onesync/" >dokumentationen</TxAnchor>.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Automatisk Start" showIf={showAdvanced}>
                <SwitchText
                    id={cfg.autoStart.eid}
                    checkedLabel="Aktiveret"
                    uncheckedLabel="Deaktiveret"
                    checked={states.autoStart}
                    onCheckedChange={cfg.autoStart.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Start serveren automatisk efter <strong>txAdmin</strong> startes.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Resource Starttolerance" htmlFor={cfg.resourceTolerance.eid} showIf={showAdvanced}>
                <Select
                    value={selectNumberUtil.toUi(states.resourceTolerance)}
                    onValueChange={(val) => cfg.resourceTolerance.state.set(selectNumberUtil.toCfg(val))}
                    disabled={pageCtx.isReadOnly}
                >
                    <SelectTrigger id={cfg.resourceTolerance.eid}>
                        <SelectValue placeholder="Vælg..." />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="90">1.5 minutter (standard)</SelectItem>
                        <SelectItem value="180">3 minutter</SelectItem>
                        <SelectItem value="300">5 minutter</SelectItem>
                        <SelectItem value="600">10 minutter</SelectItem>
                    </SelectContent>
                </Select>
                <SettingItemDesc>
                    Ved server start, hvor lang tid skal der ventes på at en enkelt ressource starter, før serveren gemstarter. <br />
                    <strong>Note:</strong> Hvis du får <InlineCode>failed to start in time</InlineCode> fejl, forøg denne værdi.
                </SettingItemDesc>
            </SettingItem>
        </SettingsCardShell>
    )
}
