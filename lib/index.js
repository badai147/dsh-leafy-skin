/**
 * dsh-leafy-skin host entry（Host 侧）。
 *
 * 皮肤本体是客户端的 token 覆盖层，Host 侧只做一件事：在 index 响应里补一段
 * 首帧 CSS。ui-theme 的引导样式把画布底色与 --dsh-boot-bg 写死成 #fff/#151517，
 * 插件起来之前的第一帧还是官方灰白，所以这里追加一条同结构的样式行（排在
 * ui-theme 之后，同等特异性下后写者胜）把首帧也染成叶绿。
 */
export const name = 'leafy-skin'

/** 浅色画布 / 深色画布，与 lib/client.js 里 --dsw-alias-bg-base 的取值保持一致。 */
const LIGHT_BG = '#F1F6ED'
const DARK_BG = '#131A12'

/**
 * 首帧引导 CSS。
 *
 * 规则顺序即优先级（同一特异性下后写者胜），覆盖六种组合：
 *   1. 脚本未运行前：浅色系统 → 浅色；深色系统 → 深色（规则 2 猜一把）。
 *   2. body 脚本写入 html[data-ds-theme-source] 与 body[data-ds-dark-theme] 后：
 *      light → 浅色；dark → 深色；system → 跟随系统（规则 5 覆盖规则 3）。
 *   3. body[data-ds-dark-theme] 作为兜底（属性被别处切换时也正确）。
 */
const BOOT_CSS = [
	`body{background-color:${LIGHT_BG};--dsh-boot-bg:${LIGHT_BG}}`,
	`@media (prefers-color-scheme:dark){body:not([data-ds-dark-theme]){background-color:${DARK_BG};--dsh-boot-bg:${DARK_BG}}}`,
	`html[data-ds-theme-source="light"] body,html[data-ds-theme-source="system"] body{background-color:${LIGHT_BG};--dsh-boot-bg:${LIGHT_BG}}`,
	`html[data-ds-theme-source="dark"] body{background-color:${DARK_BG};--dsh-boot-bg:${DARK_BG}}`,
	`@media (prefers-color-scheme:dark){html[data-ds-theme-source="system"] body{background-color:${DARK_BG};--dsh-boot-bg:${DARK_BG}}}`,
	`body[data-ds-dark-theme]{background-color:${DARK_BG};--dsh-boot-bg:${DARK_BG}}`,
].join('')

/**
 * 把首帧样式追加进 index 注入表。
 * @param ctx - Host 插件上下文。
 */
export function apply(ctx) {
	ctx.on('webserver/index-inject', (table) => {
		table.push({ kind: 'style', text: BOOT_CSS })
	})
}
