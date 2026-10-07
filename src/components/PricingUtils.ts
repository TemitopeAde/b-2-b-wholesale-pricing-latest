import { queryAllRules, updateUnifiedRule } from "../backend/pricing.client";
import { type PricingRule } from "./PricingRulesTypes";


const fetchMOQRulesFromCollection = async (): Promise<any[]> => {
    try {
        const { items } = await import("@wix/data");
        let allItems: any[] = [];
        let hasNext = true;
        let skip = 0;
        const limit = 1000;

        while (hasNext) {
            const results = await items.query("@wd-strategies/wholesale-appllication/PricingRules")
                .skip(skip)
                .limit(limit)
                .find();

            allItems = allItems.concat(results.items);
            hasNext = results.hasNext();
            skip += limit;
        }

        return allItems;
    } catch {
        return [];
    }
};

