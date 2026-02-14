import { Input } from "@/components/ui/input"
import { Button } from '@/components/ui/button'
import TxAnchor from '@/components/TxAnchor'
import { RotateCcwIcon, XIcon } from 'lucide-react'
import SwitchText from '@/components/SwitchText'
import InlineCode from '@/components/InlineCode'
import { SettingItem, SettingItemDesc } from '../settingsItems'
import { useEffect, useRef, useMemo, useReducer } from "react"
import { getConfigEmptyState, getConfigAccessors, SettingsCardProps, getPageConfig, configsReducer, getConfigDiff } from "../utils"
import SettingsCardShell from "../SettingsCardShell"
import { Textarea } from "@/components/ui/textarea"
import { txToast } from "@/components/TxToaster"


//We are not validating the JSON, only that it is a string
export const attemptBeautifyJsonString = (input: string) => {
    try {
        return JSON.stringify(JSON.parse(input), null, 4);
    } catch (error) {
        return input;
    }
};


export const pageConfigs = {
    botEnabled: getPageConfig('discordBot', 'enabled'),
    botToken: getPageConfig('discordBot', 'token'),
    discordGuild: getPageConfig('discordBot', 'guild'),
    warningsChannel: getPageConfig('discordBot', 'warningsChannel'),
    embedJson: getPageConfig('discordBot', 'embedJson'),
    embedConfigJson: getPageConfig('discordBot', 'embedConfigJson'),
} as const;

export default function ConfigCardDiscord({ cardCtx, pageCtx }: SettingsCardProps) {
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
    const botTokenRef = useRef<HTMLInputElement | null>(null);
    const discordGuildRef = useRef<HTMLInputElement | null>(null);
    const warningsChannelRef = useRef<HTMLInputElement | null>(null);

    //Marshalling Utils
    const emptyToNull = (str?: string) => {
        if (str === undefined) return undefined;
        const trimmed = str.trim();
        return trimmed.length ? trimmed : null;
    };

    //Processes the state of the page and sets the card as pending save if needed
    const updatePageState = () => {
        const overwrites = {
            botToken: emptyToNull(botTokenRef.current?.value),
            discordGuild: emptyToNull(discordGuildRef.current?.value),
            warningsChannel: emptyToNull(warningsChannelRef.current?.value),
        };

        const res = getConfigDiff(cfg, states, overwrites, false);
        pageCtx.setCardPendingSave(res.hasChanges ? cardCtx : null);
        return res;
    }

    //Validate changes (for UX only) and trigger the save API
    const handleOnSave = () => {
        const { hasChanges, localConfigs } = updatePageState();
        if (!hasChanges) return;

        if (localConfigs.discordBot?.enabled) {
            if (!localConfigs.discordBot?.token) {
                return txToast.error('Du skal angive et discord bot token for at aktivere botten.');
            }
            if (!localConfigs.discordBot?.guild) {
                return txToast.error('Du skal specificere en discord server for at aktivere botten.');
            }
            if (!localConfigs.discordBot?.embedJson || !localConfigs.discordBot?.embedConfigJson) {
                return txToast.error('You must provide both the Embed JSON and Config JSON to enable the bot.');
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
            <SettingItem label="Discord Bot">
                <SwitchText
                    id={cfg.botEnabled.eid}
                    checkedLabel="Aktiveret"
                    uncheckedLabel="Deaktiveret"
                    variant="checkedGreen"
                    checked={states.botEnabled}
                    onCheckedChange={cfg.botEnabled.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Aktiver discord integrationen.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Token" htmlFor={cfg.botToken.eid} required={states.botEnabled}>
                <Input
                    id={cfg.botToken.eid}
                    ref={botTokenRef}
                    defaultValue={cfg.botToken.initialValue}
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                    placeholder="xxxxxxxxxxxxxxxxxxxxxxxx.xxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    maxLength={96}
                    autoComplete="off"
                    className="blur-input"
                    required
                />
                <SettingItemDesc>
                    For at få en token og få botten til at joine din server, følg disse 2 guides:
                    <TxAnchor href="https://discordjs.guide/preparations/setting-up-a-bot-application.html">Opsæt en discord bot</TxAnchor> og <TxAnchor href="https://discordjs.guide/preparations/adding-your-bot-to-servers.html">Tilføj en bot til din server</TxAnchor> <br />
                    <strong>Note:</strong> Lad vær med at genbruge en token fra en anden bot. <br />
                    <strong>Note:</strong> Denne bot kræver <strong>Server Members</strong> intentionen, som kan blive sat her
                    <TxAnchor href="https://discord.com/developers/applications">Discord Udvikler Portal</TxAnchor>.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Discord Server ID" htmlFor={cfg.discordGuild.eid} required={states.botEnabled}>
                <Input
                    id={cfg.discordGuild.eid}
                    ref={discordGuildRef}
                    defaultValue={cfg.discordGuild.initialValue}
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                    placeholder='000000000000000000'
                />
                <SettingItemDesc>
                    ID'et på din discord server (også kendt som et Guild ID). <br />
                    For at få din Server ID, Gå til din indstillinger på discord og
                    <TxAnchor href="https://support.discordapp.com/hc/article_attachments/115002742731/mceclip0.png"> Aktiver Udvikler tilstand</TxAnchor>, bagefter højreklik på din servers ikon og tryk "Copy ID".
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Advarsels Kanal ID" htmlFor={cfg.warningsChannel.eid} showOptional>
                <Input
                    id={cfg.warningsChannel.eid}
                    ref={warningsChannelRef}
                    defaultValue={cfg.warningsChannel.initialValue}
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                    placeholder='000000000000000000'
                />
                <SettingItemDesc>
                    ID på kanalen som du gerne vil sende opdaterinbger ud i (f.eks. server genstart). <br />
                    Du kan efterlade feltet tomt hvis du vil deaktivere denne funktion. <br />
                    For at få kanalens ID, Gå til indstillinger på discord og
                    <TxAnchor href="https://support.discordapp.com/hc/article_attachments/115002742731/mceclip0.png"> aktiver udvikler tilstand</TxAnchor>, så højreklik på kanalen du vil have opdateringer i og tryk på "Copy ID".
                </SettingItemDesc>
            </SettingItem>
            {/* <SettingItem label="Status Embed">
                <div className="flex flex-wrap gap-6">
                    <Button
                        size={'sm'}
                        variant="secondary"
                        disabled={pageCtx.isReadOnly}
                        // FIXME: implement
                    >
                        <PencilIcon className='size-4 mr-1.5 inline-block' /> Change Embed JSON
                    </Button>
                    <Button
                        size={'sm'}
                        variant="secondary"
                        disabled={pageCtx.isReadOnly}
                        // FIXME: implement
                    >
                        <PencilIcon className='size-4 mr-1.5 inline-block' /> Change Config JSON
                    </Button>
                </div>
                <SettingItemDesc>
                    The server status embed is customizable by editing the two JSONs above. <br />
                    <strong>Note:</strong> Use the command <InlineCode>/status add</InlineCode> on a channel that the bot has the "Send Message" permission to setup the embed.
                </SettingItemDesc>
            </SettingItem> */}
            <SettingItem label="Status Embed JSON" htmlFor={cfg.embedJson.eid} required={states.botEnabled}>
                <div className="flex flex-col gap-2">
                    <Textarea
                        id={cfg.embedJson.eid}
                        placeholder='{}'
                        value={attemptBeautifyJsonString(states.embedJson ?? '')}
                        onChange={(e) => cfg.embedJson.state.set(e.target.value)}
                        autoComplete="off"
                        style={{ minHeight: 512 }}
                        disabled={pageCtx.isReadOnly}
                        spellCheck={false}
                    />
                    <div className="w-full flex flex-wrap justify-between gap-6">
                        <Button
                            className="grow"
                            variant="outline"
                            onClick={() => cfg.embedJson.state.discard()}
                            disabled={pageCtx.isReadOnly}
                        >
                            <XIcon className="mr-2 h-4 w-4" /> Kassér ændringer
                        </Button>
                        <Button
                            className="grow border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            variant="outline"
                            onClick={() => cfg.embedJson.state.default()}
                            disabled={pageCtx.isReadOnly}
                        >
                            <RotateCcwIcon className="mr-2 h-4 w-4" /> Nulstil til standard
                        </Button>
                    </div>
                </div>
                <SettingItemDesc>
                    Server status beskeden er mulig at tilpasse ved hjælpe af JSON ovenover. <br />
                    <strong>Note:</strong> brug kommandoen <InlineCode>/status add</InlineCode> på en kanal som botten har "Send Beskeder" tilladelsen for at sette statussen op.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Status Konfiguration JSON" htmlFor={cfg.embedConfigJson.eid} required={states.botEnabled}>
                <div className="flex flex-col gap-2">
                    <Textarea
                        id={cfg.embedConfigJson.eid}
                        placeholder='{}'
                        value={attemptBeautifyJsonString(states.embedConfigJson ?? '')}
                        onChange={(e) => cfg.embedConfigJson.state.set(e.target.value)}
                        autoComplete="off"
                        style={{ minHeight: 512 }}
                        disabled={pageCtx.isReadOnly}
                        spellCheck={false}
                    />
                    <div className="w-full flex flex-wrap justify-between gap-6">
                        <Button
                            className="grow"
                            variant="outline"
                            onClick={() => cfg.embedConfigJson.state.discard()}
                            disabled={pageCtx.isReadOnly}
                        >
                            <XIcon className="mr-2 h-4 w-4" /> Kassér ændringer
                        </Button>
                        <Button
                            className="grow border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                            variant="outline"
                            onClick={() => cfg.embedConfigJson.state.default()}
                            disabled={pageCtx.isReadOnly}
                        >
                            <RotateCcwIcon className="mr-2 h-4 w-4" /> Nulstil til standard
                        </Button>
                    </div>
                </div>
                <SettingItemDesc>
                    Server Status Embed er mulig at tilpasse ved at ændre på JSON ovenover. <br />
                    <strong>Note:</strong> Brug kommandoen <InlineCode>/status add</InlineCode> på en kanal hvor botten har "Send Beskeder" tilladelsen for at opsætte server status i den pågældende kanal.
                </SettingItemDesc>
            </SettingItem>
        </SettingsCardShell>
    )
}
