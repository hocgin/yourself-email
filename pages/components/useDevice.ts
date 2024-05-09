"use client";

import {useResponsive} from "ahooks/es/useResponsive";
import {useUpdateEffect} from "ahooks";
import {useEffect, useMemo, useState} from "react";


export enum DeviceType {
    Pad = "Pad",
    Mobile = "Mobile",
    PC = "PC"
}

/**
 *   'xs': 0,
 * ===== ios =====
 *   'sm': 576,
 *   'md': 768,
 * ===== pad =====
 *   'lg': 992,
 *   'xl': 1200,
 *
 *   floatMenu
 */
export const useDevice = () => {
    const responsive = useResponsive() ?? {xl: true};
    let {deviceType, layout} = useMemo(() => {
        let deviceType = DeviceType.PC;
        let layout = [14, 20, 66];
        if (responsive?.xl) {
            deviceType = DeviceType.PC;
            layout = [14, 20, 66];
        } else if (responsive?.sm) {
            deviceType = DeviceType.Pad;
            layout = [0, 25, 75];
        } else {
            deviceType = DeviceType.Mobile;
            layout = [0, 100, 0];
        }
        return {deviceType, layout};
    }, [responsive]);
    let [useDrawer, setUseDrawer] = useState<boolean>(() => [DeviceType.Mobile, DeviceType.Pad].includes(deviceType));
    useUpdateEffect(() => setUseDrawer([DeviceType.Mobile, DeviceType.Pad].includes(deviceType)), [deviceType]);
    return {
        isMobile: [DeviceType.Mobile].includes(deviceType),
        useDrawer,
        setUseDrawer,
        deviceType,
        layout
    } as const;
};
