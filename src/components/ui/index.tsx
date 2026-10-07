/*
 * Wholesale dashboard UI kit — plain HTML/CSS components that replace the Wix Design System.
 * Layout/text primitives (Box, Text, Heading, Button, …) keep familiar prop names so screens
 * read the same; tables and modals use purpose-built components (DataTable, Modal, ConfirmDialog).
 */
import React, {
    type CSSProperties,
    type FC,
    type ReactNode,
    forwardRef,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import ReactDOM from 'react-dom';
import s from './ui.module.css';
import { DashIcons } from '../Dashboard/icons';

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

let idCounter = 0;
const useId = (prefix: string) => {
    const ref = useRef<string>();
    if (!ref.current) ref.current = `${prefix}-${++idCounter}`;
    return ref.current;
};

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------

const SPACE: Record<string, string> = {
    none: '0', '0': '0',
    tiny: '4px', extraSmall: '6px', small: '12px', medium: '18px', large: '24px', extraLarge: '32px',
    SP1: '6px', SP2: '12px', SP3: '18px', SP4: '24px', SP5: '30px', SP6: '36px', SP7: '42px', SP8: '48px',
};

const resolveSpace = (value?: string | number): string | undefined => {
    if (value === undefined || value === null) return undefined;
    if (typeof value === 'number') return `${value}px`;
    return value.split(/\s+/).map(part => SPACE[part] ?? part).join(' ');
};

const NAMED_COLORS: Record<string, string> = {
    B10: 'var(--wh-accent)', B20: 'var(--wh-accent-hover)', B50: 'var(--wh-accent-tint)',
    D10: 'var(--wh-ink)', D20: 'var(--wh-ink-2)', D40: 'var(--wh-muted)', D50: 'var(--wh-line)', D80: '#ffffff',
    R10: 'var(--wh-red)', G10: 'var(--wh-green)', Y10: 'var(--wh-amber)',
};

const resolveColor = (value?: string): string | undefined => {
    if (!value) return undefined;
    if (NAMED_COLORS[value]) return NAMED_COLORS[value];
    if (/^[0-9a-fA-F]{6}$|^[0-9a-fA-F]{3}$/.test(value)) return `#${value}`;
    return value;
};

// "1px solid E5E7EB" → "1px solid #E5E7EB"
const resolveBorder = (value?: string): string | undefined =>
    value ? value.replace(/(^|\s)([0-9a-fA-F]{6})(?=\s|$)/g, '$1#$2') : undefined;

// ---------------------------------------------------------------------------
// Box — flex container (default row)
// ---------------------------------------------------------------------------

type Align = 'left' | 'center' | 'right' | 'space-between' | 'top' | 'middle' | 'bottom' | 'stretch';

const JUSTIFY: Record<string, string> = {
    left: 'flex-start', top: 'flex-start', center: 'center', middle: 'center',
    right: 'flex-end', bottom: 'flex-end', 'space-between': 'space-between', stretch: 'stretch',
};

export interface BoxProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'color'> {
    direction?: 'horizontal' | 'vertical';
    gap?: string | number;
    align?: Align;
    verticalAlign?: Align;
    padding?: string | number;
    paddingTop?: string; paddingBottom?: string; paddingLeft?: string; paddingRight?: string;
    margin?: string; marginTop?: string; marginBottom?: string; marginLeft?: string; marginRight?: string;
    backgroundColor?: string;
    color?: string;
    border?: string; borderTop?: string; borderBottom?: string; borderLeft?: string; borderRight?: string;
    borderRadius?: string;
    boxShadow?: string;
    width?: string; height?: string; minWidth?: string; minHeight?: string; maxWidth?: string; maxHeight?: string;
    flex?: string | number;
    flexWrap?: CSSProperties['flexWrap'];
    wrap?: boolean;
    overflow?: string; overflowX?: string; overflowY?: string;
    position?: CSSProperties['position'];
    top?: string; left?: string; right?: string; bottom?: string;
    zIndex?: number;
    cursor?: string;
    textAlign?: CSSProperties['textAlign'];
    inline?: boolean;
    dataHook?: string;
}

export const Box = forwardRef<HTMLDivElement, BoxProps>(({
    direction = 'horizontal', gap, align, verticalAlign,
    padding, paddingTop, paddingBottom, paddingLeft, paddingRight,
    margin, marginTop, marginBottom, marginLeft, marginRight,
    backgroundColor, color, border, borderTop, borderBottom, borderLeft, borderRight, borderRadius, boxShadow,
    width, height, minWidth, minHeight, maxWidth, maxHeight, flex, flexWrap, wrap,
    overflow, overflowX, overflowY, position, top, left, right, bottom, zIndex, cursor, textAlign, inline, dataHook,
    className, style, children, ...rest
}, ref) => {
    const vertical = direction === 'vertical';
    const main = vertical ? verticalAlign : align;
    const cross = vertical ? align : verticalAlign;

    const boxStyle: CSSProperties = {
        display: inline ? 'inline-flex' : 'flex',
        flexDirection: vertical ? 'column' : 'row',
        justifyContent: main ? JUSTIFY[main] : undefined,
        alignItems: cross ? JUSTIFY[cross] : undefined,
        gap: resolveSpace(gap),
        padding: resolveSpace(padding),
        paddingTop: resolveSpace(paddingTop), paddingBottom: resolveSpace(paddingBottom),
        paddingLeft: resolveSpace(paddingLeft), paddingRight: resolveSpace(paddingRight),
        margin: resolveSpace(margin),
        marginTop: resolveSpace(marginTop), marginBottom: resolveSpace(marginBottom),
        marginLeft: resolveSpace(marginLeft), marginRight: resolveSpace(marginRight),
        backgroundColor: resolveColor(backgroundColor),
        color: resolveColor(color),
        border: resolveBorder(border),
        borderTop: resolveBorder(borderTop), borderBottom: resolveBorder(borderBottom),
        borderLeft: resolveBorder(borderLeft), borderRight: resolveBorder(borderRight),
        borderRadius, boxShadow,
        width, height, minWidth, minHeight, maxWidth, maxHeight,
        flex: flex as CSSProperties['flex'],
        flexWrap: flexWrap ?? (wrap ? 'wrap' : undefined),
        overflow, overflowX: overflowX as CSSProperties['overflowX'], overflowY: overflowY as CSSProperties['overflowY'],
        position, top, left, right, bottom, zIndex, cursor, textAlign,
        ...style,
    };

    return (
        <div ref={ref} className={cx(s.box, className)} style={boxStyle} data-hook={dataHook} {...rest}>
            {children}
        </div>
    );
});
Box.displayName = 'Box';

// ---------------------------------------------------------------------------
// Typography
// ---------------------------------------------------------------------------

type TextColor = 'critical' | 'success' | 'warning' | 'error' | 'red' | 'green' | 'orange' | string;

const TEXT_COLOR_CLASS: Record<string, string> = {
    critical: s.textCritical, error: s.textCritical, red: s.textCritical, danger: s.textCritical,
    success: s.textSuccess, green: s.textSuccess,
    warning: s.textWarning, orange: s.textWarning,
};

export interface TextProps {
    size?: 'tiny' | 'small' | 'medium';
    weight?: 'thin' | 'normal' | 'bold';
    secondary?: boolean;
    light?: boolean;
    color?: TextColor;
    skin?: 'standard' | 'error' | 'success' | 'premium' | 'disabled' | 'primary';
    tagName?: keyof JSX.IntrinsicElements;
    ellipsis?: boolean;
    marginBottom?: string;
    className?: string;
    style?: CSSProperties;
    title?: string;
    id?: string;
    children?: ReactNode;
}

export const Text: FC<TextProps> = ({
    size = 'medium', weight, secondary, light, color, skin, tagName = 'span', ellipsis, marginBottom,
    className, style, children, ...rest
}) => {
    const Tag = tagName as any;
    const colorClass = (color && TEXT_COLOR_CLASS[color]) || (skin === 'error' ? s.textCritical : skin === 'success' ? s.textSuccess : undefined);
    const customColor = color && !TEXT_COLOR_CLASS[color] ? resolveColor(color) : undefined;
    return (
        <Tag
            className={cx(
                s.text,
                size === 'tiny' ? s.textTiny : size === 'small' ? s.textSmall : s.textMedium,
                weight === 'bold' && s.textBold,
                (secondary || skin === 'disabled') && s.textSecondary,
                light && s.textLight,
                colorClass,
                ellipsis && s.truncate,
                className,
            )}
            style={{ color: customColor, marginBottom: resolveSpace(marginBottom), ...style }}
            {...rest}
        >
            {children}
        </Tag>
    );
};

const HEADING_CLASS: Record<string, string> = { H1: s.h1, H2: s.h2, H3: s.h3, H4: s.h4, H5: s.h5, H6: s.h5 };

export const Heading: FC<{
    appearance?: 'H1' | 'H2' | 'H3' | 'H4' | 'H5' | 'H6';
    as?: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6';
    className?: string;
    style?: CSSProperties;
    id?: string;
    children?: ReactNode;
}> = ({ appearance = 'H1', as, className, style, id, children }) => {
    const Tag = (as || appearance.toLowerCase()) as any;
    return <Tag id={id} className={cx(s.heading, HEADING_CLASS[appearance], className)} style={style}>{children}</Tag>;
};

// ---------------------------------------------------------------------------
// Buttons
// ---------------------------------------------------------------------------

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'dangerSecondary' | 'success' | 'light';

const VARIANT_CLASS: Record<ButtonVariant, string> = {
    primary: s.btnPrimary, secondary: s.btnSecondary, ghost: s.btnGhost, danger: s.btnDanger,
    dangerSecondary: s.btnDangerSecondary, success: s.btnSuccess, light: s.btnLight,
};

export interface ButtonProps {
    variant?: ButtonVariant;
    /** WDS-style alias: 'secondary' → secondary variant */
    priority?: 'primary' | 'secondary';
    /** WDS-style alias: 'destructive' → danger variant */
    skin?: 'standard' | 'destructive' | 'premium' | 'light' | 'dark' | 'inverted' | 'transparent';
    size?: 'tiny' | 'small' | 'medium' | 'large';
    prefixIcon?: ReactNode;
    suffixIcon?: ReactNode;
    loading?: boolean;
    fullWidth?: boolean;
    disabled?: boolean;
    type?: 'button' | 'submit' | 'reset';
    as?: 'a' | 'button';
    href?: string;
    target?: string;
    rel?: string;
    onClick?: (e: React.MouseEvent<any>) => void;
    className?: string;
    style?: CSSProperties;
    title?: string;
    id?: string;
    dataHook?: string;
    'aria-label'?: string;
    children?: ReactNode;
}

const resolveVariant = (variant?: ButtonVariant, priority?: string, skin?: string): ButtonVariant => {
    if (variant) return variant;
    if (skin === 'destructive') return priority === 'secondary' ? 'dangerSecondary' : 'danger';
    if (skin === 'light' || skin === 'inverted') return 'light';
    if (skin === 'transparent') return 'ghost';
    return priority === 'secondary' ? 'secondary' : 'primary';
};

export const Button: FC<ButtonProps> = ({
    variant, priority, skin, size = 'medium', prefixIcon, suffixIcon, loading, fullWidth, disabled,
    type = 'button', as, href, target, rel, onClick, className, style, dataHook, children, ...rest
}) => {
    const classes = cx(
        s.btn,
        VARIANT_CLASS[resolveVariant(variant, priority, skin)],
        size === 'tiny' && s.btnTiny,
        size === 'small' && s.btnSmall,
        size === 'large' && s.btnLarge,
        fullWidth && s.btnFull,
        className,
    );
    const content = (
        <>
            {loading ? <Loader size="tiny" /> : prefixIcon}
            {children}
            {suffixIcon}
        </>
    );

    if (as === 'a' || href) {
        return (
            <a
                className={cx(classes, disabled && s.btnDisabled)}
                href={disabled ? undefined : href}
                target={target}
                rel={rel ?? (target === '_blank' ? 'noopener noreferrer' : undefined)}
                onClick={onClick}
                style={style}
                aria-disabled={disabled || undefined}
                data-hook={dataHook}
                {...rest}
            >
                {content}
            </a>
        );
    }

    return (
        <button
            type={type}
            className={classes}
            disabled={disabled || loading}
            onClick={onClick}
            style={style}
            data-hook={dataHook}
            {...rest}
        >
            {content}
        </button>
    );
};

export const IconButton: FC<{
    'aria-label': string;
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    size?: 'small' | 'medium';
    title?: string;
    className?: string;
    children: ReactNode;
}> = ({ size = 'medium', className, children, title, ...rest }) => (
    <button
        type="button"
        className={cx(s.iconBtn, size === 'small' && s.iconBtnSmall, className)}
        title={title ?? rest['aria-label']}
        {...rest}
    >
        {children}
    </button>
);

export const TextButton: FC<{
    size?: 'tiny' | 'small' | 'medium';
    onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    prefixIcon?: ReactNode;
    suffixIcon?: ReactNode;
    skin?: string;
    className?: string;
    children?: ReactNode;
}> = ({ size = 'medium', prefixIcon, suffixIcon, skin: _skin, className, children, ...rest }) => (
    <button type="button" className={cx(s.textBtn, size !== 'medium' && s.textBtnSmall, className)} {...rest}>
        {prefixIcon}
        {children}
        {suffixIcon}
    </button>
);

// ---------------------------------------------------------------------------
// Feedback
// ---------------------------------------------------------------------------

export const Loader: FC<{ size?: 'tiny' | 'small' | 'medium' | 'large'; text?: string; className?: string }> = ({
    size = 'medium', text, className,
}) => {
    const spinner = (
        <span
            className={cx(
                s.spinner,
                size === 'tiny' && s.spinnerTiny,
                size === 'small' && s.spinnerSmall,
                size === 'medium' && s.spinnerMedium,
                size === 'large' && s.spinnerLarge,
                className,
            )}
            role="status"
            aria-label={text || 'Loading'}
        />
    );
    if (!text) return spinner;
    return <span className={s.loadingBlock}>{spinner}<span>{text}</span></span>;
};

export const LoadingBlock: FC<{ message?: string }> = ({ message = 'Loading…' }) => (
    <div className={s.loadingBlock} role="status" aria-live="polite">
        <span className={cx(s.spinner, s.spinnerMedium)} aria-hidden="true" />
        <span>{message}</span>
    </div>
);

export type BadgeTone = 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'pink';

const BADGE_CLASS: Record<BadgeTone, string> = {
    success: s.badgeSuccess, warning: s.badgeWarning, danger: s.badgeDanger,
    neutral: s.badgeNeutral, info: s.badgeInfo, pink: s.badgePink,
};

const BADGE_SKIN_ALIAS: Record<string, BadgeTone> = {
    success: 'success', warning: 'warning', warningLight: 'warning', danger: 'danger', urgent: 'danger',
    neutral: 'neutral', neutralLight: 'neutral', neutralStandard: 'neutral', standard: 'info', general: 'info',
    premium: 'pink', dark: 'neutral', light: 'neutral',
};

export const Badge: FC<{
    tone?: BadgeTone;
    skin?: string;
    dot?: boolean;
    size?: string;
    prefixIcon?: ReactNode;
    className?: string;
    children?: ReactNode;
}> = ({ tone, skin, dot = true, prefixIcon, className, children }) => {
    const resolved: BadgeTone = tone || (skin && BADGE_SKIN_ALIAS[skin]) || 'neutral';
    return (
        <span className={cx(s.badge, BADGE_CLASS[resolved], (!dot || !!prefixIcon) && s.badgePlain, className)}>
            {prefixIcon}
            {children}
        </span>
    );
};

export type NoticeTone = 'info' | 'warning' | 'error' | 'success' | 'neutral';

const NOTICE_CLASS: Record<NoticeTone, string> = {
    info: s.noticeInfo, warning: s.noticeWarning, error: s.noticeError, success: s.noticeSuccess, neutral: s.noticeNeutral,
};

const NOTICE_ICON: Record<NoticeTone, ReactNode> = {
    info: <DashIcons.Info size={16} />,
    warning: <DashIcons.Alert size={16} />,
    error: <DashIcons.Alert size={16} />,
    success: <DashIcons.CheckCircle size={16} />,
    neutral: <DashIcons.Info size={16} />,
};

export const Notice: FC<{
    tone?: NoticeTone;
    title?: ReactNode;
    icon?: ReactNode | false;
    action?: ReactNode;
    className?: string;
    style?: CSSProperties;
    children?: ReactNode;
}> = ({ tone = 'info', title, icon, action, className, style, children }) => (
    <div
        className={cx(s.notice, NOTICE_CLASS[tone], className)}
        role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}
        style={style}
    >
        {icon !== false && <span className={s.noticeIcon}>{icon ?? NOTICE_ICON[tone]}</span>}
        <div className={s.noticeBody}>
            {title && <strong style={{ display: 'block' }}>{title}</strong>}
            {children}
        </div>
        {action}
    </div>
);

/** WDS-compatible alias used by older screens. */
export const Notification: FC<{ theme?: string; type?: string; children?: ReactNode }> = ({ theme, children }) => {
    const tone: NoticeTone = theme === 'error' ? 'error' : theme === 'warning' ? 'warning' : theme === 'success' ? 'success' : 'info';
    return <Notice tone={tone}>{children}</Notice>;
};

export const EmptyState: FC<{ title: ReactNode; subtitle?: ReactNode; icon?: ReactNode; action?: ReactNode }> = ({
    title, subtitle, icon, action,
}) => (
    <div className={s.empty}>
        {icon && <div className={s.emptyIcon}>{icon}</div>}
        <div className={s.emptyTitle}>{title}</div>
        {subtitle && <div className={s.emptyText}>{subtitle}</div>}
        {action && <div style={{ marginTop: 8 }}>{action}</div>}
    </div>
);

export const Divider: FC<{ className?: string; style?: CSSProperties }> = ({ className, style }) => (
    <hr className={cx(s.divider, className)} style={style} />
);

// ---------------------------------------------------------------------------
// Page structure
// ---------------------------------------------------------------------------

export const Page = forwardRef<HTMLDivElement, { className?: string; children?: ReactNode }>(({ className, children }, ref) => (
    <div ref={ref} className={cx(s.root, s.page, className)}>{children}</div>
));
Page.displayName = 'Page';

export const PageHeader: FC<{
    title: ReactNode;
    subtitle?: ReactNode;
    breadcrumb?: ReactNode;
    actions?: ReactNode;
    /** WDS-style alias for `actions` */
    actionsBar?: ReactNode;
}> = ({ title, subtitle, breadcrumb, actions, actionsBar }) => (
    <header className={s.pageHeader}>
        <div className={s.pageHeaderText}>
            {breadcrumb && <div className={s.breadcrumb}>{breadcrumb}</div>}
            <h1 className={s.pageTitle}>{title}</h1>
            {subtitle && <p className={s.pageSubtitle}>{subtitle}</p>}
        </div>
        {(actions || actionsBar) && <div className={s.pageActions}>{actions || actionsBar}</div>}
    </header>
);

interface CardComponent extends FC<{ className?: string; style?: CSSProperties; children?: ReactNode; 'aria-label'?: string }> {
    Header: FC<{ title: ReactNode; subtitle?: ReactNode; suffix?: ReactNode; children?: ReactNode }>;
    Content: FC<{ className?: string; style?: CSSProperties; children?: ReactNode }>;
    Divider: FC;
}

const CardBase: FC<{ className?: string; style?: CSSProperties; children?: ReactNode; 'aria-label'?: string }> = ({
    className, style, children, ...rest
}) => (
    <section className={cx(s.root, s.card, className)} style={style} {...rest}>{children}</section>
);

export const Card = CardBase as CardComponent;
Card.Header = ({ title, subtitle, suffix, children }) => (
    <div className={s.cardHeader}>
        <div className={s.cardHeaderText}>
            <h2 className={s.cardTitle}>{title}</h2>
            {subtitle && <span className={s.cardSubtitle}>{subtitle}</span>}
        </div>
        {children}
        {suffix}
    </div>
);
Card.Content = ({ className, style, children }) => <div className={cx(s.cardBody, className)} style={style}>{children}</div>;
Card.Divider = () => <Divider />;

// ---------------------------------------------------------------------------
// Form controls
// ---------------------------------------------------------------------------

interface FieldContextValue { id?: string; invalid?: boolean }
const FieldContext = React.createContext<FieldContextValue>({});

export const FormField: FC<{
    label?: ReactNode;
    required?: boolean;
    hint?: ReactNode;
    /** WDS alias for hint */
    infoContent?: ReactNode;
    error?: ReactNode;
    statusMessage?: ReactNode;
    status?: 'error' | 'warning';
    className?: string;
    style?: CSSProperties;
    children?: ReactNode;
}> = ({ label, required, hint, infoContent, error, statusMessage, status, className, style, children }) => {
    const id = useId('field');
    const labelText = typeof label === 'string' ? label.replace(/\s*\*\s*$/, '') : label;
    const isRequired = required || (typeof label === 'string' && /\*\s*$/.test(label));
    const errorText = error ?? (status === 'error' ? statusMessage : undefined);
    return (
        <FieldContext.Provider value={{ id, invalid: !!errorText }}>
            <div className={cx(s.field, className)} style={style}>
                {label && (
                    <label className={s.fieldLabel} htmlFor={id}>
                        {labelText}
                        {isRequired && <span className={s.fieldRequired} aria-hidden="true">*</span>}
                    </label>
                )}
                {children}
                {errorText ? (
                    <span className={s.fieldError}>{errorText}</span>
                ) : (hint || infoContent || statusMessage) ? (
                    <span className={s.fieldHint}>{hint || infoContent || statusMessage}</span>
                ) : null}
            </div>
        </FieldContext.Provider>
    );
};

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'prefix'> {
    status?: 'error' | 'warning' | 'loading';
    statusMessage?: ReactNode;
    prefix?: ReactNode;
    suffix?: ReactNode;
    size?: 'small' | 'medium' | 'large';
    clearButton?: boolean;
    onClear?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(({
    status, statusMessage: _statusMessage, prefix, suffix, size = 'medium', clearButton, onClear, className, style, id, disabled, ...rest
}, ref) => {
    const field = React.useContext(FieldContext);
    const invalid = status === 'error' || field.invalid;

    // The mouse wheel must never change a number: blur on wheel so the page scrolls
    // instead (React wheel listeners are passive, so preventDefault() won't work).
    if (rest.type === 'number') {
        const { onWheel } = rest;
        rest.onWheel = (e) => {
            e.currentTarget.blur();
            onWheel?.(e);
        };
    }

    // Number inputs are non-negative unless a caller passes a negative `min`:
    // block the minus/exponent keys and strip a minus from pasted or dropped values.
    const nonNegative = rest.type === 'number' && !(rest.min !== undefined && Number(rest.min) < 0);
    if (nonNegative) {
        const { onKeyDown, onChange } = rest;
        rest.min = rest.min ?? 0;
        rest.onKeyDown = (e) => {
            if (e.key === '-' || e.key === '+' || e.key === 'e' || e.key === 'E') e.preventDefault();
            onKeyDown?.(e);
        };
        rest.onChange = (e) => {
            if (e.target.value.startsWith('-')) e.target.value = e.target.value.replace(/^-+/, '');
            onChange?.(e);
        };
    }

    return (
        <div
            className={cx(
                s.inputWrap,
                size === 'small' && s.inputWrapSmall,
                invalid && s.inputWrapError,
                disabled && s.inputWrapDisabled,
                className,
            )}
            style={style}
        >
            {prefix && <span className={s.affix}>{prefix}</span>}
            <input
                ref={ref}
                id={id ?? field.id}
                className={s.input}
                disabled={disabled}
                aria-invalid={invalid || undefined}
                {...rest}
            />
            {status === 'loading' && <Loader size="tiny" />}
            {clearButton && rest.value && (
                <button type="button" className={s.clearBtn} aria-label="Clear" onClick={onClear}>
                    <DashIcons.X size={14} />
                </button>
            )}
            {suffix && <span className={s.affix}>{suffix}</span>}
        </div>
    );
});
Input.displayName = 'Input';

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
    ({ className, id, ...rest }, ref) => {
        const field = React.useContext(FieldContext);
        return <textarea ref={ref} id={id ?? field.id} className={cx(s.textarea, className)} {...rest} />;
    },
);
Textarea.displayName = 'Textarea';

export const Search: FC<{
    value?: string;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onClear?: () => void;
    placeholder?: string;
    size?: 'small' | 'medium';
    'aria-label'?: string;
    className?: string;
    style?: CSSProperties;
}> = ({ value, onChange, onClear, placeholder = 'Search…', size = 'medium', className, style, ...rest }) => (
    <div className={cx(s.inputWrap, size === 'small' && s.inputWrapSmall, className)} style={style}>
        <span className={s.affix}><DashIcons.Search size={16} /></span>
        <input
            type="search"
            className={s.input}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            aria-label={rest['aria-label'] ?? placeholder}
        />
        {value && onClear && (
            <button type="button" className={s.clearBtn} aria-label="Clear search" onClick={onClear}>
                <DashIcons.X size={14} />
            </button>
        )}
    </div>
);

export interface SelectOption { id: string | number; value: ReactNode; label?: string; disabled?: boolean }

const optionText = (option: SelectOption) =>
    option.label ?? (typeof option.value === 'string' || typeof option.value === 'number' ? String(option.value) : String(option.id));

/** Native select with WDS Dropdown-compatible props. */
export const Dropdown: FC<{
    options: SelectOption[];
    selectedId?: string | number | null;
    onSelect?: (option: SelectOption) => void;
    placeholder?: string;
    disabled?: boolean;
    size?: 'small' | 'medium';
    status?: 'error';
    id?: string;
    'aria-label'?: string;
    className?: string;
    style?: CSSProperties;
}> = ({ options, selectedId, onSelect, placeholder, disabled, size = 'medium', id, className, style, ...rest }) => {
    const field = React.useContext(FieldContext);
    const hasSelection = selectedId !== undefined && selectedId !== null && selectedId !== '';
    return (
        <select
            id={id ?? field.id}
            className={cx(s.select, size === 'small' && s.selectSmall, className)}
            style={style}
            value={hasSelection ? String(selectedId) : ''}
            disabled={disabled}
            aria-label={rest['aria-label']}
            onChange={(e) => {
                const option = options.find(o => String(o.id) === e.target.value);
                if (option && onSelect) onSelect(option);
            }}
        >
            {(!hasSelection || placeholder) && (
                <option value="" disabled>{placeholder || 'Select…'}</option>
            )}
            {options.map(option => (
                <option key={option.id} value={String(option.id)} disabled={option.disabled}>
                    {optionText(option)}
                </option>
            ))}
        </select>
    );
};

export const Select: FC<React.SelectHTMLAttributes<HTMLSelectElement> & { size?: 'small' | 'medium' }> = ({
    size = 'medium', className, id, children, ...rest
}) => {
    const field = React.useContext(FieldContext);
    return (
        <select id={id ?? field.id} className={cx(s.select, size === 'small' && s.selectSmall, className)} {...rest}>
            {children}
        </select>
    );
};

export const Checkbox: FC<{
    checked?: boolean;
    indeterminate?: boolean;
    disabled?: boolean;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    'aria-label'?: string;
    className?: string;
    children?: ReactNode;
}> = ({ checked = false, indeterminate = false, disabled, onChange, className, children, ...rest }) => {
    const ref = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (ref.current) ref.current.indeterminate = indeterminate;
    }, [indeterminate]);
    return (
        <label className={cx(s.check, disabled && s.checkDisabled, className)} onClick={(e) => e.stopPropagation()}>
            <input
                ref={ref}
                type="checkbox"
                className={s.checkInput}
                checked={checked}
                disabled={disabled}
                onChange={onChange}
                aria-label={rest['aria-label'] ?? (children ? undefined : 'Select')}
            />
            <span className={cx(s.checkBox, indeterminate && !checked && s.checkBoxMixed)} aria-hidden="true">
                {checked ? <DashIcons.Check size={12} /> : indeterminate ? <DashIcons.Minus size={12} /> : null}
            </span>
            {children}
        </label>
    );
};

export const ToggleSwitch: FC<{
    checked?: boolean;
    disabled?: boolean;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    size?: string;
    'aria-label'?: string;
    children?: ReactNode;
}> = ({ checked = false, disabled, onChange, children, ...rest }) => (
    <label className={s.toggle} onClick={(e) => e.stopPropagation()}>
        <input
            type="checkbox"
            role="switch"
            className={s.toggleInput}
            checked={checked}
            disabled={disabled}
            onChange={onChange}
            aria-checked={checked}
            aria-label={rest['aria-label']}
        />
        <span className={s.toggleTrack} aria-hidden="true" />
        {children}
    </label>
);

// ---------------------------------------------------------------------------
// Combobox (AutoComplete / MultiSelect)
// ---------------------------------------------------------------------------

const useOutsideClick = (ref: React.RefObject<HTMLElement>, onOutside: () => void, active: boolean) => {
    useEffect(() => {
        if (!active) return;
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) onOutside();
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [active]);
};

const ComboBox: FC<{
    options: SelectOption[];
    inputValue: string;
    setInputValue: (value: string) => void;
    onPick: (option: SelectOption) => void;
    placeholder?: string;
    size?: 'small' | 'medium';
    disabled?: boolean;
    onClear?: () => void;
    emptyMessage?: string;
    selectedId?: string | number;
    id?: string;
}> = ({ options, inputValue, setInputValue, onPick, placeholder, size = 'medium', disabled, onClear, emptyMessage, selectedId, id }) => {
    const field = React.useContext(FieldContext);
    const listId = useId('combo');
    const wrapRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    useOutsideClick(wrapRef, () => setOpen(false), open);

    const query = inputValue.trim().toLowerCase();
    const filtered = query ? options.filter(o => optionText(o).toLowerCase().includes(query)) : options;
    const visible = filtered.slice(0, 200);

    const pick = (option: SelectOption) => {
        if (option.disabled) return;
        onPick(option);
        setOpen(false);
    };

    const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setActive(a => Math.min(a + 1, visible.length - 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
        else if (e.key === 'Enter' && open && visible[active]) { e.preventDefault(); pick(visible[active]); }
        else if (e.key === 'Escape') { setOpen(false); }
    };

    return (
        <div className={s.combo} ref={wrapRef}>
            <div className={cx(s.inputWrap, size === 'small' && s.inputWrapSmall, disabled && s.inputWrapDisabled)}>
                <input
                    id={id ?? field.id}
                    className={s.input}
                    value={inputValue}
                    placeholder={placeholder}
                    disabled={disabled}
                    role="combobox"
                    aria-expanded={open}
                    aria-controls={listId}
                    aria-autocomplete="list"
                    onFocus={() => setOpen(true)}
                    onChange={(e) => { setInputValue(e.target.value); setOpen(true); setActive(0); }}
                    onKeyDown={onKeyDown}
                />
                {inputValue && onClear && (
                    <button type="button" className={s.clearBtn} aria-label="Clear" onClick={() => { onClear(); setOpen(false); }}>
                        <DashIcons.X size={14} />
                    </button>
                )}
                <span className={s.affix} aria-hidden="true"><DashIcons.ChevronDown size={14} /></span>
            </div>
            {open && (
                <ul className={s.comboList} id={listId} role="listbox">
                    {visible.length === 0 ? (
                        <li className={s.comboEmpty}>{emptyMessage || 'No matches'}</li>
                    ) : visible.map((option, index) => (
                        <li
                            key={option.id}
                            role="option"
                            aria-selected={option.id === selectedId}
                            aria-disabled={option.disabled || undefined}
                            className={cx(
                                s.comboOption,
                                index === active && s.comboOptionActive,
                                option.id === selectedId && s.comboOptionSelected,
                            )}
                            style={option.disabled ? { opacity: 0.45, cursor: 'not-allowed' } : undefined}
                            onMouseEnter={() => setActive(index)}
                            onMouseDown={(e) => { e.preventDefault(); pick(option); }}
                        >
                            {option.value}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};

export const AutoComplete: FC<{
    options: SelectOption[];
    onSelect?: (option: SelectOption) => void;
    onClear?: () => void;
    placeholder?: string;
    size?: 'small' | 'medium';
    disabled?: boolean;
    value?: string;
    onChange?: (e: { target: { value: string } }) => void;
}> = ({ options, onSelect, onClear, placeholder, size, disabled, value, onChange }) => {
    const [internal, setInternal] = useState('');
    const inputValue = value ?? internal;
    const [selectedId, setSelectedId] = useState<string | number>();
    return (
        <ComboBox
            options={options}
            inputValue={inputValue}
            setInputValue={(v) => { setInternal(v); onChange?.({ target: { value: v } }); }}
            onPick={(option) => {
                setSelectedId(option.id);
                setInternal(optionText(option));
                onChange?.({ target: { value: optionText(option) } });
                onSelect?.(option);
            }}
            onClear={() => { setInternal(''); setSelectedId(undefined); onChange?.({ target: { value: '' } }); onClear?.(); }}
            placeholder={placeholder}
            size={size}
            disabled={disabled}
            selectedId={selectedId}
        />
    );
};

export const MultiSelect: FC<{
    options: SelectOption[];
    tags: Array<{ id: string | number; label: ReactNode }>;
    onSelect: (option: SelectOption) => void;
    onRemoveTag: (id: any) => void;
    placeholder?: string;
    disabled?: boolean;
    value?: string;
    onChange?: (e: { target: { value: string } }) => void;
    emptyMessage?: string;
}> = ({ options, tags, onSelect, onRemoveTag, placeholder = 'Search and select…', disabled, value, onChange, emptyMessage }) => {
    const [internal, setInternal] = useState('');
    const inputValue = value ?? internal;
    const setValue = (v: string) => { setInternal(v); onChange?.({ target: { value: v } }); };
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <ComboBox
                options={options}
                inputValue={inputValue}
                setInputValue={setValue}
                onPick={(option) => { onSelect(option); setValue(''); }}
                placeholder={placeholder}
                disabled={disabled}
                emptyMessage={emptyMessage}
            />
            {tags.length > 0 && (
                <div className={s.tags}>
                    {tags.map(tag => (
                        <span key={tag.id} className={s.tag}>
                            {tag.label}
                            <button
                                type="button"
                                className={s.tagRemove}
                                aria-label={`Remove ${typeof tag.label === 'string' ? tag.label : ''}`}
                                onClick={() => onRemoveTag(tag.id)}
                                disabled={disabled}
                            >
                                <DashIcons.X size={12} />
                            </button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export const Tabs: FC<{
    items: Array<{ id: string | number; title: ReactNode }>;
    activeId?: string | number;
    onClick?: (item: { id: string | number; title: ReactNode }) => void;
    'aria-label'?: string;
    className?: string;
    type?: string;
}> = ({ items, activeId, onClick, className, ...rest }) => (
    <div className={cx(s.tabs, className)} role="tablist" aria-label={rest['aria-label']}>
        {items.map(item => {
            const active = item.id === activeId;
            return (
                <button
                    key={item.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={cx(s.tab, active && s.tabActive)}
                    onClick={() => onClick?.(item)}
                >
                    {item.title}
                </button>
            );
        })}
    </div>
);

const pageList = (current: number, total: number): Array<number | 'gap'> => {
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
    const pages = new Set([1, total, current - 1, current, current + 1]);
    const sorted = Array.from(pages).filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
    const out: Array<number | 'gap'> = [];
    sorted.forEach((p, i) => {
        if (i > 0 && p - (sorted[i - 1] as number) > 1) out.push('gap');
        out.push(p);
    });
    return out;
};

export const Pagination: FC<{
    currentPage: number;
    totalPages: number;
    onChange: (e: { page: number }) => void;
    className?: string;
}> = ({ currentPage, totalPages, onChange, className }) => {
    if (totalPages <= 1) return null;
    return (
        <nav className={cx(s.pagination, className)} aria-label="Pagination">
            <button
                type="button"
                className={s.pageBtn}
                aria-label="Previous page"
                disabled={currentPage <= 1}
                onClick={() => onChange({ page: currentPage - 1 })}
            >
                <DashIcons.ChevronLeft size={16} />
            </button>
            {pageList(currentPage, totalPages).map((p, i) => p === 'gap' ? (
                <span key={`gap-${i}`} className={s.pageEllipsis}>…</span>
            ) : (
                <button
                    key={p}
                    type="button"
                    className={cx(s.pageBtn, p === currentPage && s.pageBtnActive)}
                    aria-current={p === currentPage ? 'page' : undefined}
                    onClick={() => onChange({ page: p })}
                >
                    {p}
                </button>
            ))}
            <button
                type="button"
                className={s.pageBtn}
                aria-label="Next page"
                disabled={currentPage >= totalPages}
                onClick={() => onChange({ page: currentPage + 1 })}
            >
                <DashIcons.ChevronRight size={16} />
            </button>
        </nav>
    );
};

export const Accordion: FC<{
    items: Array<{ title: ReactNode; children?: ReactNode; content?: ReactNode; open?: boolean; initiallyOpen?: boolean; icon?: ReactNode }>;
}> = ({ items }) => {
    const [openIndex, setOpenIndex] = useState<number | null>(() => {
        const i = items.findIndex(item => item.open || item.initiallyOpen);
        return i >= 0 ? i : null;
    });
    const baseId = useId('acc');
    return (
        <div className={s.accordion}>
            {items.map((item, index) => {
                const open = openIndex === index;
                return (
                    <div key={index} className={s.accordionItem}>
                        <button
                            type="button"
                            className={s.accordionHeader}
                            aria-expanded={open}
                            aria-controls={`${baseId}-${index}`}
                            onClick={() => setOpenIndex(open ? null : index)}
                        >
                            {item.icon}
                            {item.title}
                            <span className={cx(s.accordionChevron, open && s.accordionChevronOpen)}>
                                <DashIcons.ChevronDown size={16} />
                            </span>
                        </button>
                        {open && (
                            <div id={`${baseId}-${index}`} className={s.accordionPanel}>
                                {item.children ?? item.content}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// ---------------------------------------------------------------------------
// Tables
// ---------------------------------------------------------------------------

export interface Column<T> {
    title: ReactNode;
    render: (row: T, index: number) => ReactNode;
    width?: string;
    align?: 'left' | 'center' | 'right';
    key?: string;
}

export function DataTable<T>({
    data, columns, rowKey, onRowClick, isRowSelected, emptyState, className,
}: {
    data: T[];
    columns: Column<T>[];
    rowKey: (row: T, index: number) => string | number;
    onRowClick?: (row: T) => void;
    isRowSelected?: (row: T) => boolean;
    emptyState?: ReactNode;
    className?: string;
}) {
    if (data.length === 0 && emptyState) return <>{emptyState}</>;
    const alignClass = (align?: string) => align === 'right' ? s.cellRight : align === 'center' ? s.cellCenter : undefined;
    return (
        <div className={cx(s.tableWrap, className)}>
            <table className={s.table}>
                <thead>
                    <tr>
                        {columns.map((col, i) => (
                            <th key={col.key ?? i} scope="col" style={{ width: col.width }} className={alignClass(col.align)}>
                                {col.title}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, index) => (
                        <tr
                            key={rowKey(row, index)}
                            className={cx(onRowClick && s.rowClickable, isRowSelected?.(row) && s.rowSelected)}
                            onClick={onRowClick ? () => onRowClick(row) : undefined}
                        >
                            {columns.map((col, i) => (
                                <td key={col.key ?? i} className={alignClass(col.align)}>{col.render(row, index)}</td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export const CellStack: FC<{ primary: ReactNode; secondary?: ReactNode; title?: string }> = ({ primary, secondary, title }) => (
    <div className={s.cellStack}>
        <span className={cx(s.cellPrimary, s.truncate)} title={title}>{primary}</span>
        {secondary && <span className={cx(s.cellSecondary, s.truncate)}>{secondary}</span>}
    </div>
);

export const TableFooter: FC<{ children?: ReactNode }> = ({ children }) => <div className={s.tableFooter}>{children}</div>;

export const SelectionBar: FC<{ count: number; onClear?: () => void; disabled?: boolean; children?: ReactNode }> = ({
    count, onClear, disabled, children,
}) => (
    <div className={s.selectionBar} role="region" aria-label="Bulk actions">
        <span className={s.selectionCount}>{count} selected</span>
        {children}
        {onClear && (
            <span style={{ marginLeft: 'auto' }}>
                <TextButton size="small" onClick={onClear} disabled={disabled}>Clear selection</TextButton>
            </span>
        )}
    </div>
);

export interface RowAction {
    text: string;
    onClick: () => void;
    icon?: ReactNode;
    disabled?: boolean;
    danger?: boolean;
}

/** Visible primary action plus an overflow menu for the rest. */
export const RowActions: FC<{
    primaryAction?: RowAction & { variant?: ButtonVariant; loading?: boolean };
    secondaryActions?: RowAction[];
    /** Secondary actions shown as icon buttons instead of in the menu */
    inlineCount?: number;
}> = ({ primaryAction, secondaryActions = [], inlineCount = 0 }) => {
    const [open, setOpen] = useState(false);
    // Menu is portaled with fixed positioning so table overflow can't clip it
    const [menuPos, setMenuPos] = useState<React.CSSProperties | null>(null);
    const anchorRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) return;
        const handler = (e: MouseEvent) => {
            const target = e.target as Node;
            if (anchorRef.current?.contains(target) || menuRef.current?.contains(target)) return;
            setOpen(false);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    useLayoutEffect(() => {
        if (!open || !anchorRef.current) return;
        const rect = anchorRef.current.getBoundingClientRect();
        const openUp = window.innerHeight - rect.bottom < 48 * secondaryActions.length + 24;
        setMenuPos({
            position: 'fixed',
            right: window.innerWidth - rect.right,
            ...(openUp
                ? { top: 'auto', bottom: window.innerHeight - rect.top + 4 }
                : { top: rect.bottom + 4, bottom: 'auto' }),
        });
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
        // Fixed menu would drift from its anchor on scroll/resize, so close it
        const close = () => setOpen(false);
        document.addEventListener('keydown', onKey);
        window.addEventListener('scroll', close, true);
        window.addEventListener('resize', close);
        return () => {
            document.removeEventListener('keydown', onKey);
            window.removeEventListener('scroll', close, true);
            window.removeEventListener('resize', close);
        };
    }, [open]);

    const inline = secondaryActions.slice(0, inlineCount);
    const menuItems = secondaryActions.slice(inlineCount);

    return (
        <div className={s.rowActions} onClick={(e) => e.stopPropagation()}>
            {primaryAction && (
                <Button
                    size="small"
                    variant={primaryAction.variant ?? 'secondary'}
                    onClick={primaryAction.onClick}
                    disabled={primaryAction.disabled}
                    loading={primaryAction.loading}
                    prefixIcon={primaryAction.icon}
                >
                    {primaryAction.text}
                </Button>
            )}
            {inline.map(action => (
                <IconButton
                    key={action.text}
                    aria-label={action.text}
                    onClick={action.onClick}
                    disabled={action.disabled}
                    className={action.danger ? s.menuItemDanger : undefined}
                >
                    {action.icon}
                </IconButton>
            ))}
            {menuItems.length > 0 && (
                <div className={s.menuAnchor} ref={anchorRef}>
                    <IconButton aria-label="More actions" onClick={() => setOpen(o => !o)}>
                        <DashIcons.More size={18} />
                    </IconButton>
                    {open && ReactDOM.createPortal(
                        <div
                            ref={menuRef}
                            className={cx(s.root, s.menu)}
                            style={menuPos ?? { visibility: 'hidden' }}
                            role="menu"
                            onClick={(e) => e.stopPropagation()}
                        >
                            {menuItems.map(action => (
                                <button
                                    key={action.text}
                                    type="button"
                                    role="menuitem"
                                    className={cx(s.menuItem, action.danger && s.menuItemDanger)}
                                    disabled={action.disabled}
                                    onClick={() => { setOpen(false); action.onClick(); }}
                                >
                                    {action.icon}
                                    {action.text}
                                </button>
                            ))}
                        </div>,
                        document.body
                    )}
                </div>
            )}
        </div>
    );
};

// ---------------------------------------------------------------------------
// Modal
// ---------------------------------------------------------------------------

const MODAL_SIZE: Record<string, string> = {
    small: s.modalSmall, medium: s.modalMedium, large: s.modalLarge, xlarge: s.modalXLarge,
};

export interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: ReactNode;
    subtitle?: ReactNode;
    icon?: ReactNode;
    size?: 'small' | 'medium' | 'large' | 'xlarge';
    footer?: ReactNode;
    /** Prevents closing via Esc/overlay while work is in progress */
    busy?: boolean;
    closeOnOverlayClick?: boolean;
    hideCloseButton?: boolean;
    role?: 'dialog' | 'alertdialog';
    bodyStyle?: CSSProperties;
    children?: ReactNode;
}

export const Modal: FC<ModalProps> = ({
    isOpen, onClose, title, subtitle, icon, size = 'medium', footer, busy, closeOnOverlayClick = true,
    hideCloseButton, role = 'dialog', bodyStyle, children,
}) => {
    const titleId = useId('modal-title');
    const dialogRef = useRef<HTMLDivElement>(null);
    const onCloseRef = useRef(onClose);
    onCloseRef.current = onClose;
    const busyRef = useRef(busy);
    busyRef.current = busy;

    useEffect(() => {
        if (!isOpen) return;
        const previouslyFocused = document.activeElement as HTMLElement | null;
        const dialog = dialogRef.current;
        const focusable = dialog?.querySelector<HTMLElement>(
            '[data-autofocus], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]):not([data-close])',
        );
        (focusable || dialog)?.focus();

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !busyRef.current) {
                e.stopPropagation();
                onCloseRef.current();
            }
            if (e.key === 'Tab' && dialog) {
                const nodes = Array.from(dialog.querySelectorAll<HTMLElement>(
                    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
                ));
                if (nodes.length === 0) return;
                const first = nodes[0];
                const last = nodes[nodes.length - 1];
                if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
                else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
            }
        };
        document.addEventListener('keydown', onKeyDown);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.removeEventListener('keydown', onKeyDown);
            document.body.style.overflow = prevOverflow;
            previouslyFocused?.focus?.();
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return ReactDOM.createPortal(
        <div
            className={cx(s.root, s.overlay)}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && closeOnOverlayClick && !busy) onClose();
            }}
        >
            <div
                ref={dialogRef}
                className={cx(s.modal, MODAL_SIZE[size])}
                role={role}
                aria-modal="true"
                aria-labelledby={title ? titleId : undefined}
                tabIndex={-1}
            >
                {(title || !hideCloseButton) && (
                    <div className={s.modalHeader}>
                        {icon}
                        <div className={s.modalHeaderText}>
                            {title && <h2 id={titleId} className={s.modalTitle}>{title}</h2>}
                            {subtitle && <p className={s.modalSubtitle}>{subtitle}</p>}
                        </div>
                        {!hideCloseButton && (
                            <IconButton aria-label="Close" onClick={onClose} disabled={busy} size="small">
                                <DashIcons.X size={18} />
                            </IconButton>
                        )}
                    </div>
                )}
                <div className={s.modalBody} style={bodyStyle}>{children}</div>
                {footer && <div className={s.modalFooter}>{footer}</div>}
            </div>
        </div>,
        document.body,
    );
};

export type ConfirmTone = 'danger' | 'warning' | 'primary' | 'success';

const CONFIRM_ICON: Record<ConfirmTone, ReactNode> = {
    danger: <DashIcons.Trash size={20} />,
    warning: <DashIcons.Alert size={20} />,
    primary: <DashIcons.Info size={20} />,
    success: <DashIcons.CheckCircle size={20} />,
};

const CONFIRM_ICON_CLASS: Record<ConfirmTone, string> = {
    danger: s.confirmIconDanger, warning: s.confirmIconWarning, primary: s.confirmIconPrimary, success: s.confirmIconSuccess,
};

const CONFIRM_BUTTON: Record<ConfirmTone, ButtonVariant> = {
    danger: 'danger', warning: 'danger', primary: 'primary', success: 'success',
};

export const ConfirmDialog: FC<{
    isOpen: boolean;
    title: ReactNode;
    message?: ReactNode;
    subMessage?: ReactNode;
    confirmText?: string;
    cancelText?: string;
    tone?: ConfirmTone;
    isLoading?: boolean;
    confirmDisabled?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    children?: ReactNode;
}> = ({
    isOpen, title, message, subMessage, confirmText = 'Confirm', cancelText = 'Cancel', tone = 'primary',
    isLoading, confirmDisabled, onConfirm, onCancel, children,
}) => (
    <Modal
        isOpen={isOpen}
        onClose={onCancel}
        title={title}
        size="small"
        busy={isLoading}
        role="alertdialog"
        icon={<span className={cx(s.confirmIcon, CONFIRM_ICON_CLASS[tone])}>{CONFIRM_ICON[tone]}</span>}
        footer={
            <>
                <Button variant="secondary" onClick={onCancel} disabled={isLoading} data-close>
                    {cancelText}
                </Button>
                <Button variant={CONFIRM_BUTTON[tone]} onClick={onConfirm} loading={isLoading} disabled={confirmDisabled}>
                    {confirmText}
                </Button>
            </>
        }
    >
        {message && <p style={{ margin: 0, color: 'var(--wh-ink-2)' }}>{message}</p>}
        {subMessage && <p style={{ margin: '8px 0 0', color: 'var(--wh-muted)', fontSize: 13 }}>{subMessage}</p>}
        {children}
    </Modal>
);

// ---------------------------------------------------------------------------
// Read-only details
// ---------------------------------------------------------------------------

export const Details: FC<{ children?: ReactNode }> = ({ children }) => <dl className={s.details}>{children}</dl>;

export const Detail: FC<{ label: ReactNode; full?: boolean; children?: ReactNode }> = ({ label, full, children }) => {
    const empty = children === undefined || children === null || children === '';
    return (
        <div className={cx(s.detail, full && s.detailFull)}>
            <dt className={s.detailLabel}>{label}</dt>
            <dd className={cx(s.detailValue, empty && s.detailEmpty)}>{empty ? 'Not provided' : children}</dd>
        </div>
    );
};

export const ScrollTopButton: FC<{ onClick: () => void }> = ({ onClick }) => (
    <button type="button" className={s.fab} onClick={onClick} aria-label="Scroll to top">
        <DashIcons.ChevronUp size={20} />
    </button>
);

export const VisuallyHidden: FC<{ children?: ReactNode }> = ({ children }) => <span className={s.visuallyHidden}>{children}</span>;

// ---------------------------------------------------------------------------
// Stat tiles, toolbar, choice tiles
// ---------------------------------------------------------------------------

export type Tone = 'blue' | 'amber' | 'green' | 'pink' | 'red' | 'neutral';

const TONE_CLASS: Record<Tone, string> = {
    blue: s.toneBlue, amber: s.toneAmber, green: s.toneGreen, pink: s.tonePink, red: s.toneRed, neutral: s.toneNeutral,
};

export const StatGrid: FC<{ children?: ReactNode; style?: CSSProperties }> = ({ children, style }) => (
    <div className={s.stats} style={style}>{children}</div>
);

export const StatTile: FC<{
    label: ReactNode;
    value: ReactNode;
    note?: ReactNode;
    icon?: ReactNode;
    tone?: Tone;
}> = ({ label, value, note, icon, tone = 'blue' }) => (
    <div className={s.stat}>
        <div className={s.statTop}>
            <span className={s.statLabel}>{label}</span>
            {icon && <span className={cx(s.statIcon, TONE_CLASS[tone])}>{icon}</span>}
        </div>
        <div className={s.statValue}>{value}</div>
        {note && <div className={s.statNote}>{note}</div>}
    </div>
);

export const Toolbar: FC<{ children?: ReactNode; style?: CSSProperties }> = ({ children, style }) => (
    <div className={s.toolbar} style={style}>{children}</div>
);

export const ToolbarSpacer: FC = () => <span className={s.toolbarGrow} />;

export const ChoiceTile: FC<{
    active: boolean;
    onClick: () => void;
    title: ReactNode;
    description?: ReactNode;
    icon?: ReactNode;
    tone?: Tone;
    disabled?: boolean;
}> = ({ active, onClick, title, description, icon, tone = 'blue', disabled }) => (
    <button
        type="button"
        className={cx(s.choice, active && s.choiceActive)}
        aria-pressed={active}
        onClick={onClick}
        disabled={disabled}
        style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
    >
        {icon && <span className={cx(s.statIcon, TONE_CLASS[tone])}>{icon}</span>}
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span className={s.choiceTitle}>{title}</span>
            {description && <span className={s.choiceText}>{description}</span>}
        </span>
    </button>
);
