import { type ThemeFamily, type ThemePalette } from "../../../lib/theme";
import { useThemeStore } from "../useThemeStore";

const paletteFields: Array<{ family: ThemeFamily; label: string }> = [
	{ family: "primary", label: "Primary" },
	{ family: "accent", label: "Accent" },
	{ family: "background", label: "Background" },
	{ family: "panel", label: "Panel" },
	{ family: "text", label: "Text" },
];

function ThemePalettePanel() {
	const palette = useThemeStore((state) => state.palette);
	const resetPalette = useThemeStore((state) => state.resetPalette);
	const setPaletteColor = useThemeStore((state) => state.setPaletteColor);

	return (
		<section className="rounded-[var(--radius-card)] border border-panel-80 bg-panel-15 p-5 shadow-[var(--shadow-panel)]">
			<div className="flex items-center justify-between gap-4">
				<div>
					<h2 className="text-xl font-semibold text-text-60">Theme</h2>
					<p className="mt-1 text-sm leading-6 text-text-35">
						Color scheme saves locally
					</p>
				</div>
				<button
					type="button"
					className="btn-secondary"
					onClick={() => resetPalette()}
				>
					Reset
				</button>
			</div>
			<div className="mt-4 flex justify-center flex-wrap gap-2">
				{paletteFields.map(({ family, label }) => (
					<PaletteButton
						key={family}
						family={family}
						label={label}
						palette={palette}
						onPick={(color) => setPaletteColor(family, color)}
					/>
				))}
			</div>
		</section>
	);
}

function PaletteButton({
	family,
	label,
	palette,
	onPick,
}: {
	family: ThemeFamily;
	label: string;
	palette: ThemePalette;
	onPick: (color: string) => void;
}) {
	return (
		<label className="flex cursor-pointer flex-col items-center gap-1.5 rounded-xl border border-panel-15 bg-background-0 px-3 py-2 text-xs font-semibold text-text-50 transition hover:border-primary-25 hover:bg-primary-5 hover:text-primary-70">
			<input
				type="color"
				aria-label={`${label} color`}
				style={{ position: "absolute", width: 0, height: 0, opacity: 0 }}
				value={palette[family]}
				onChange={(e) => onPick(e.currentTarget.value)}
			/>
			<span
				className="block h-5 w-5 rounded-full border border-text-10"
				style={{ backgroundColor: palette[family] }}
			/>
			{label}
		</label>
	);
}

export default ThemePalettePanel;
