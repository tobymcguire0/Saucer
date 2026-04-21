import { useEffect, useState } from "react";

import {
	normalizeHexColor,
	type ThemeFamily,
	type ThemePalette,
} from "../../../lib/theme";
import { useThemeStore } from "../useThemeStore";

const paletteFields: Array<{
	family: ThemeFamily;
	label: string;
	description: string;
}> = [
	{
		family: "primary",
		label: "Primary",
		description: "Main action color",
	},
	{
		family: "accent",
		label: "Accent",
		description: "Highlights and alerts",
	},
	{
		family: "background",
		label: "Background",
		description: "App canvas and soft surfaces",
	},
	{
		family: "panel",
		label: "Panel",
		description: "Cards, sections, and framing",
	},
	{
		family: "text",
		label: "Text",
		description: "Readable copy and dark contrast",
	},
];

function ThemePalettePanel() {
	const palette = useThemeStore((state) => state.palette);
	const resetPalette = useThemeStore((state) => state.resetPalette);
	const setPaletteColor = useThemeStore((state) => state.setPaletteColor);
	const [isExpanded, setIsExpanded] = useState(false);
	const [draft, setDraft] = useState<ThemePalette>(palette);
	const [invalidFamilies, setInvalidFamilies] = useState<
		Partial<Record<ThemeFamily, true>>
	>({});

	useEffect(() => {
		setDraft(palette);
		setInvalidFamilies({});
	}, [palette]);

	function clearFamilyError(family: ThemeFamily) {
		setInvalidFamilies((current) => {
			if (!current[family]) {
				return current;
			}

			const next = { ...current };
			delete next[family];
			return next;
		});
	}

	function commitFamilyColor(family: ThemeFamily) {
		const normalized = normalizeHexColor(draft[family]);

		if (!normalized) {
			setInvalidFamilies((current) => ({ ...current, [family]: true }));
			return;
		}

		clearFamilyError(family);
		setDraft((current) => ({ ...current, [family]: normalized }));
		setPaletteColor(family, normalized);
	}

	return (
		<section className="rounded-[var(--radius-card)] border border-panel-15 bg-background-0 p-5 shadow-[var(--shadow-panel)]">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h2 className="text-xl font-semibold text-text-60">Theme palette</h2>
					<p className="mt-1 text-sm leading-6 text-text-35">
						Adjust the Saucer color system and save it locally.
					</p>
				</div>
				<button
					type="button"
					className="btn-secondary"
					aria-controls="theme-palette-editor"
					aria-expanded={isExpanded}
					onClick={() => setIsExpanded((current) => !current)}
				>
					Theme palette
				</button>
			</div>
			{isExpanded ? (
				<div id="theme-palette-editor" className="mt-4 space-y-4">
					<div className="grid gap-4">
						{paletteFields.map(({ family, label, description }) => (
							<div
								key={family}
								className="rounded-[var(--radius-card)] border border-panel-15 bg-background-5 p-4"
							>
								<div className="flex items-start justify-between gap-3">
									<div>
										<label
											htmlFor={`${family}-hex`}
											className="text-sm font-medium text-text-60"
										>
											{label} hex
										</label>
										<p className="mt-1 text-xs uppercase tracking-[0.18em] text-text-35">
											{description}
										</p>
									</div>
									<span
										aria-hidden="true"
										className="mt-1 h-5 w-5 shrink-0 rounded-full border border-text-10"
										style={{ backgroundColor: palette[family] }}
									/>
								</div>
								<input
									id={`${family}-hex`}
									className="field-input mt-3"
									value={draft[family]}
									onChange={(event) => {
										const nextValue = event.currentTarget.value;
										clearFamilyError(family);
										setDraft((current) => ({
											...current,
											[family]: nextValue,
										}));
									}}
									onBlur={() => commitFamilyColor(family)}
								/>
								{invalidFamilies[family] ? (
									<p className="mt-2 text-sm text-accent-60">
										Enter a valid 3- or 6-digit hex color.
									</p>
								) : null}
							</div>
						))}
					</div>
					<div className="flex justify-end">
						<button
							type="button"
							className="btn-secondary"
							onClick={() => resetPalette()}
						>
							Reset palette
						</button>
					</div>
				</div>
			) : null}
		</section>
	);
}

export default ThemePalettePanel;
