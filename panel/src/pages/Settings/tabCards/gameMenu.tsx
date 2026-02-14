import { Input } from "@/components/ui/input";
import SwitchText from '@/components/SwitchText';
import InlineCode from '@/components/InlineCode';
import { AdvancedDivider, SettingItem, SettingItemDesc } from '../settingsItems';
import { useState, useEffect, useMemo, useReducer } from "react";
import { getConfigEmptyState, getConfigAccessors, SettingsCardProps, getPageConfig, configsReducer, getConfigDiff } from "../utils";
import SettingsCardShell from "../SettingsCardShell";


export const pageConfigs = {
    menuEnabled: getPageConfig('gameFeatures', 'menuEnabled'),
    alignRight: getPageConfig('gameFeatures', 'menuAlignRight'),
    pageKey: getPageConfig('gameFeatures', 'menuPageKey'),
    playerModePtfx: getPageConfig('gameFeatures', 'playerModePtfx'),
} as const;

export default function ConfigCardGameMenu({ cardCtx, pageCtx }: SettingsCardProps) {
    const [showAdvanced, setShowAdvanced] = useState(false);
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


    //Processes the state of the page and sets the card as pending save if needed
    const updatePageState = () => {
        const overwrites = {};

        const res = getConfigDiff(cfg, states, overwrites, showAdvanced);
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

    //Card content stuff
    const handlePageKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!e.metaKey) e.preventDefault();

        if (["Escape", "Backspace"].includes(e.code)) {
            cfg.pageKey.state.set('Tab');
        } else {
            cfg.pageKey.state.set(e.code);
        }
    }

    return (
        <SettingsCardShell
            cardCtx={cardCtx}
            pageCtx={pageCtx}
            onClickSave={handleOnSave}
            advancedVisible={showAdvanced}
            advancedSetter={setShowAdvanced}
        >
            <SettingItem label="Ingame Menu">
                <SwitchText
                    id={cfg.menuEnabled.eid}
                    checkedLabel="Aktiveret"
                    uncheckedLabel="Deaktiveret"
                    variant="checkedGreen"
                    checked={states.menuEnabled}
                    onCheckedChange={cfg.menuEnabled.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Når aktiveret, Administratore kan åbne menuen ved at skrive <InlineCode>/tx</InlineCode> eller bruge hotkeyen fra dine FiveM/RedM indstillinger.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Juster menu til højre">
                <SwitchText
                    id={cfg.alignRight.eid}
                    checkedLabel="Justeret til højre"
                    uncheckedLabel="Justere til venstre"
                    checked={states.alignRight}
                    onCheckedChange={cfg.alignRight.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Flytter menuen til den højre side af skærmen.
                </SettingItemDesc>
            </SettingItem>
            <SettingItem label="Menu Page Switch Key" htmlFor={cfg.pageKey.eid} required>
                <Input
                    id={cfg.pageKey.eid}
                    value={states.pageKey}
                    placeholder='Klik her og bagefter på den knap du vil bruge'
                    onKeyDown={handlePageKey}
                    className="font-mono"
                    readOnly
                    onInput={updatePageState}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Knappen der bruges til at skifte faner i menuen. <br />
                    Klik ovenover og tryk på enhver knap for at ændre konfigurationen. <br />
                    <strong>Note:</strong> Standard knappen er <InlineCode>Tab</InlineCode>, og du kan ikke bruge <InlineCode>Escape</InlineCode> eller <InlineCode>Retur</InlineCode>.
                </SettingItemDesc>
            </SettingItem>

            {showAdvanced && <AdvancedDivider />}

            <SettingItem label="Effect ved ændring spiller tilstand" showIf={showAdvanced}>
                <SwitchText
                    id={cfg.playerModePtfx.eid}
                    checkedLabel="Aktiveret"
                    uncheckedLabel="Deaktiveret"
                    variant="checkedGreen"
                    checked={states.playerModePtfx}
                    onCheckedChange={cfg.playerModePtfx.state.set}
                    disabled={pageCtx.isReadOnly}
                />
                <SettingItemDesc>
                    Afspiller en partikel effekt når en administrator bruger NoClip, Gud tilstand, OSV. <br />
                    <strong className="text-warning-inline">Advarsel:</strong> Denne indstilling hjælper med at kæmpe imod administrator misbrug under PvP ved at gøre det synligt/lydlig til alle spillere at en administrator er i en unfair tilstand. Vi anbefaler at beholde den aktiveret.
                </SettingItemDesc>
            </SettingItem>
        </SettingsCardShell>
    )
}
