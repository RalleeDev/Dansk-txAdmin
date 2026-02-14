import TxAnchor from '@/components/TxAnchor';
import SwitchText from '@/components/SwitchText';
import InlineCode from '@/components/InlineCode';
import { SettingItem, SettingItemDesc } from '../settingsItems';
import { useEffect, useMemo, useReducer } from "react";
import { getConfigEmptyState, getConfigAccessors, SettingsCardProps, getPageConfig, configsReducer, getConfigDiff } from "../utils";
import SettingsCardShell from '../SettingsCardShell';


export const pageConfigs = {
    hideAdminInPunishments: getPageConfig('gameFeatures', 'hideAdminInPunishments'),
    hideAdminInMessages: getPageConfig('gameFeatures', 'hideAdminInMessages'),
    hideDefaultAnnouncement: getPageConfig('gameFeatures', 'hideDefaultAnnouncement'),
    hideDefaultDirectMessage: getPageConfig('gameFeatures', 'hideDefaultDirectMessage'),
    hideDefaultWarning: getPageConfig('gameFeatures', 'hideDefaultWarning'),
    hideScheduledRestartWarnings: getPageConfig('gameFeatures', 'hideDefaultScheduledRestartWarning'),
} as const;

export default function ConfigCardGameNotifications({ cardCtx, pageCtx }: SettingsCardProps) {
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

    //Processes the state of the page and sets the card as pending save if needed
    const updatePageState = () => {
        const overwrites = {};

        const res = getConfigDiff(cfg, states, overwrites, false);
        pageCtx.setCardPendingSave(res.hasChanges ? cardCtx : null);
        return res;
    }

    //Validate changes (for UX only) and trigger the save API
    const handleOnSave = () => {
        const { hasChanges, localConfigs } = updatePageState();
        if (!hasChanges) return;
        //NOTE: nothing to validate
        pageCtx.saveChanges(cardCtx, localConfigs);
    }

    return (
        <SettingsCardShell
            cardCtx={cardCtx}
            pageCtx={pageCtx}
            onClickSave={handleOnSave}
        >
            <SettingItem label="Skjul administrator navn ved straf">
                <SwitchText
                    id={cfg.hideAdminInPunishments.eid}
                    checkedLabel="Skjult"
                    uncheckedLabel="Synlig"
                    checked={states.hideAdminInPunishments}
                    onCheckedChange={cfg.hideAdminInPunishments.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Aldrig vis spillerne navnet på administratoren på <strong>Udelukkelser</strong> eller <strong>Advarsler</strong>. <br />
                    Denne information ville stadig være tilgængelig i historik og logs.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Skjul administratorens navn i beskeder">
                <SwitchText
                    id={cfg.hideAdminInMessages.eid}
                    checkedLabel="Skjult"
                    uncheckedLabel="Synlig"
                    checked={states.hideAdminInMessages}
                    onCheckedChange={cfg.hideAdminInMessages.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Vil ikke vise administratorens navn på <strong>Offentlige Annonceringer</strong> eller <strong>Private beskeder</strong>. <br />
                    Denne information ville stadig være tilgængelig i Live Konsollen og logs.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Skjul notifikationer for Annonceringer">
                <SwitchText
                    id={cfg.hideDefaultAnnouncement.eid}
                    checkedLabel="Skjult"
                    uncheckedLabel="Synlig"
                    checked={states.hideDefaultAnnouncement}
                    onCheckedChange={cfg.hideDefaultAnnouncement.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Dæmper displayet af anonceringer, som tillader dig at implmentere dine egne annonceringer igennem eventet <InlineCode>txAdmin:events:announcement</InlineCode>.
                    <TxAnchor href="https://aka.cfx.re/txadmin-events#txadmineventsannouncement">Dokumentation</TxAnchor>
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Skjul Notifikationer For Direkte Beskeder">
                <SwitchText
                    id={cfg.hideDefaultDirectMessage.eid}
                    checkedLabel="Skjult"
                    uncheckedLabel="Synlig"
                    checked={states.hideDefaultDirectMessage}
                    onCheckedChange={cfg.hideDefaultDirectMessage.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Skjuler notifikationer af direkte beskeder, som gør det muligt for dig at lave din egen implmentation af direkte beskeder <InlineCode>txAdmin:events:playerDirectMessage</InlineCode>.
                    <TxAnchor href="https://aka.cfx.re/txadmin-events#txadmineventsplayerdirectmessage">Dokumentation</TxAnchor>
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Skjul Advarsels Notifikationer">
                <SwitchText
                    id={cfg.hideDefaultWarning.eid}
                    checkedLabel="Skjult"
                    uncheckedLabel="Synlig"
                    checked={states.hideDefaultWarning}
                    onCheckedChange={cfg.hideDefaultWarning.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Skjuler notifikationer fra advarsler, som tillader dig af lave din egen implementation af eventet <InlineCode>txAdmin:events:playerWarned</InlineCode>.
                    <TxAnchor href="https://aka.cfx.re/txadmin-events#txadmineventsplayerwarned">Dokumentation</TxAnchor>
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Skjul Notifikationer For Planlagt Genstart">
                <SwitchText
                    id={cfg.hideScheduledRestartWarnings.eid}
                    checkedLabel="Skjult"
                    uncheckedLabel="Synlig"
                    checked={states.hideScheduledRestartWarnings}
                    onCheckedChange={cfg.hideScheduledRestartWarnings.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Skjuler notifikationer om planlagt genstart, der gør det muligt for dig at lave din egen implmentation af eventet <InlineCode>txAdmin:events:scheduledRestart</InlineCode>.
                    <TxAnchor href="https://aka.cfx.re/txadmin-events#txadmineventsscheduledrestart">Dokumentation</TxAnchor>
                </SettingItemDesc>
            </SettingItem>
        </SettingsCardShell>
    )
}
