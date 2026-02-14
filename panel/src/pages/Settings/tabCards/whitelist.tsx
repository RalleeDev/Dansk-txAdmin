import { Input } from "@/components/ui/input"
import TxAnchor from '@/components/TxAnchor'
import InlineCode from '@/components/InlineCode'
import { SettingItem, SettingItemDesc } from '../settingsItems'
import { RadioGroup } from "@/components/ui/radio-group"
import BigRadioItem from "@/components/BigRadioItem"
import { useEffect, useRef, useMemo, useReducer } from "react"
import { getConfigEmptyState, getConfigAccessors, SettingsCardProps, getPageConfig, configsReducer, getConfigDiff } from "../utils"
import { AutosizeTextarea, AutosizeTextAreaRef } from "@/components/ui/autosize-textarea"
import SettingsCardShell from "../SettingsCardShell"
import { txToast } from "@/components/TxToaster"
import consts from "@shared/consts"


export const pageConfigs = {
    whitelistMode: getPageConfig('whitelist', 'mode'),
    rejectionMessage: getPageConfig('whitelist', 'rejectionMessage'),
    discordRoles: getPageConfig('whitelist', 'discordRoles'),
} as const;

export default function ConfigCardWhitelist({ cardCtx, pageCtx }: SettingsCardProps) {
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

    //Refs for configs that don't use state
    const rejectionMessageRef = useRef<AutosizeTextAreaRef | null>(null);
    const discordRolesRef = useRef<HTMLInputElement | null>(null);

    //Marshalling Utils
    const inputArrayUtil = {
        toUi: (args?: string[]) => args ? args.join(', ') : '',
        toCfg: (str?: string) => str ? str.split(/[,;]\s*/).map(x => x.trim()).filter(x => x.length) : [],
    }

    //Processes the state of the page and sets the card as pending save if needed
    const updatePageState = () => {
        let currDiscordRoles;
        if (discordRolesRef.current) {
            currDiscordRoles = inputArrayUtil.toCfg(discordRolesRef.current.value);
        }
        const overwrites = {
            rejectionMessage: rejectionMessageRef.current?.textArea.value,
            discordRoles: currDiscordRoles,
        };

        const res = getConfigDiff(cfg, states, overwrites, false);
        pageCtx.setCardPendingSave(res.hasChanges ? cardCtx : null);
        return res;
    }

    //Validate changes (for UX only) and trigger the save API
    const handleOnSave = () => {
        const { hasChanges, localConfigs } = updatePageState();
        if (!hasChanges) return;

        if (
            localConfigs.whitelist?.rejectionMessage
            && localConfigs.whitelist.rejectionMessage.length > 512
        ) {
            return txToast.error({
                title: 'Whitelist afvisnings beskeden er for stor.',
                md: true,
                msg: 'Beskeden skal være 512 karakter eller mindre.',
            });
        }
        if (
            localConfigs.whitelist?.mode === 'discordMember'
            || localConfigs.whitelist?.mode === 'discordRoles'
        ) {
            if (pageCtx.apiData?.storedConfigs.discordBot?.enabled !== true) {
                return txToast.warning({
                    title: 'Kræver at Discord bot er aktiveret',
                    msg: 'Du skal aktivere Discord Bot i Discord fanen for at bruge Discord-baseret whitelist tilstand.',
                });
            }
            if (
                localConfigs.whitelist?.mode === 'discordRoles'
                && (
                    !Array.isArray(localConfigs.whitelist?.discordRoles)
                    || !localConfigs.whitelist?.discordRoles.length
                )
            ) {
                return txToast.warning({
                    title: 'Kræver discord roller.',
                    msg: 'Du skal specificere mindst et discord rolle-id for at bruge "Discord Server Rolle" whitelist tilstand.',
                });
            }
        }
        if (Array.isArray(localConfigs.whitelist?.discordRoles)) {
            const invalidRoles = localConfigs.whitelist.discordRoles
                .filter(x => !consts.regexDiscordSnowflake.test(x))
                .map(x => `- \`${x.slice(0, 20)}\``);
            if (invalidRoles.length) {
                return txToast.error({
                    title: 'Ugyldigt discord rolle ID(er).',
                    md: true,
                    msg: 'Følgende discord rolle ID(er) er ugyldige: \n' + invalidRoles.join('\n'),
                });
            }
        }
        pageCtx.saveChanges(cardCtx, localConfigs);
    }

    return (
        <SettingsCardShell
            cardCtx={cardCtx}
            pageCtx={pageCtx}
            onClickSave={handleOnSave}
        >
            <SettingItem label="Whitelist Tilstand">
                <RadioGroup
                    value={states.whitelistMode}
                    onValueChange={cfg.whitelistMode.state.set as any}
                    disabled={pageCtx.isReadOnly}
                >
                    <BigRadioItem
                        groupValue={states.whitelistMode}
                        value="disabled"
                        title="Deaktiveret"
                        desc="Intet whitelist status vil blive checket af txAdmin."
                    />
                    <BigRadioItem
                        groupValue={states.whitelistMode}
                        value="adminOnly"
                        title="Kun for administratorer (Vedligeholdelses tilstand)"
                        desc={(<>
                            ville kun lade spillere tilslutte sig hvis deres <InlineCode>fivem:</InlineCode> eller <InlineCode>discord:</InlineCode> identifikator er tilknyttet en txAdmin administrator. også kendt som vedligeholdelses tilstand.
                        </>)}
                    />
                    <BigRadioItem
                        groupValue={states.whitelistMode}
                        value="discordMember"
                        title="Medlem af Discord Server"
                        desc={(<>
                            Checker om spilleren der tilslutter har en <InlineCode>discord:</InlineCode> identifikator og er til stede på den discord der er specificeret i "Discord" fanen.
                        </>)}
                    />
                    <BigRadioItem
                        groupValue={states.whitelistMode}
                        value="discordRoles"
                        title="Rolle På Discord Server"
                        desc={(<>
                            Checks if the player joining has a <InlineCode>discord:</InlineCode> identifier and is present in the Discord server configured in the Discord Tab and has at least one of the roles specified below.
                        </>)}
                    />
                    <BigRadioItem
                        groupValue={states.whitelistMode}
                        value="approvedLicense"
                        title="Godkendte licenser"
                        desc={(<>
                            Spillerens <InlineCode>license:</InlineCode> identifikator skal være whitelisted af en txAdmin administrator. De kan blive gjort igennem siden <TxAnchor href="/whitelist">Whitelist</TxAnchor>, eller <InlineCode>/whitelist</InlineCode> kommandoen på discord botten.
                        </>)}
                    />
                </RadioGroup>
            </SettingItem>
            <SettingItem label="Whitelist begrundelse for afvisning" htmlFor={cfg.rejectionMessage.eid} showOptional>
                <AutosizeTextarea
                    id={cfg.rejectionMessage.eid}
                    ref={rejectionMessageRef}
                    placeholder='Join venligst http://discord.gg/example og anmod om at blive whitelisted.'
                    defaultValue={cfg.rejectionMessage.initialValue}
                    onInput={updatePageState}
                    autoComplete="off"
                    minHeight={60}
                    maxHeight={180}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Valgfri besked at vise spilleren når de bliver afvist for at tilslutte sig serveren uden whitelist <br />
                    Hvis du har en process på at ansøge om whitelist, inkludere et invite link her.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Whitelisted Discord Roller" htmlFor={cfg.discordRoles.eid}>
                <Input
                    id={cfg.discordRoles.eid}
                    ref={discordRolesRef}
                    defaultValue={inputArrayUtil.toUi(cfg.discordRoles.initialValue)}
                    placeholder="000000000000000000, 000000000000000000"
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    ID på discord rollerne der er whitelisted til at tilslutte serveren. <br />
                    Dette felt understøtter flere roller, separeret af kommaer. <br />
                    <strong>Note:</strong> Kræver at whitelist tilstanden er sat på "Rolle På Discord Servers".
                </SettingItemDesc>
            </SettingItem>
        </SettingsCardShell>
    )
}
