import React from "react";
import {cx} from "@emotion/css";
import {NODE_HANDLE_CLASS, NODE_HANDLE_CLASS_BOX, Z_INDEX_HANDLE_BOX} from "../util/constants";
import styled from "@emotion/styled";
import {convertToCSSLength} from "../util/utils";
import {Property} from "csstype";
// Used by documentation
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import {GrapherConfig} from "../data/GrapherConfig";

export type NodeHandleProps = NodeHandlePropsPositioned | NodeHandlePropsTopLeft

/**
 * Standard handle role to allow connections _from this handle_ to another.
 */
export const SOURCE = "source"
/**
 * Standard handle role to allow connections _to this handle_ from another.
 */
export const TARGET = "target"

export interface NodeHandlePropsBase {
    /**
     * Name of this handle (must be unique per-node). If not set, it will default to "handle-n": the first unnamed handle gets "handle-1" and so on (in DOM order).
     * For handles with the {@link NodeHandlePropsPositioned.position position} prop set, the name will default to the position instead.
     */
    name?: string
    /**
     * Custom CSS classes to be applied.
     */
    className?: string
    /**
     * Role(s) of this handle to restrict how edges may connect. You can use the standard roles {@link SOURCE} and {@link TARGET} for the usual directional edges.
     * Null or undefined/unspecified means no role is assigned and all edges may connect to this handle. Using an empty array will not allow any edge to connect
     * to this (except if added programmatically and config option {@link GrapherConfig.allowIllegalEdges} is set to true).
     *
     * Note: roles must only consist of alphanumerical characters, underscores or dashes.
     */
    role?: null | string | string[]
    /**
     * CSS value for width. Defaults to 6px
     */
    width?: Property.Width<number>
    /**
     * CSS value for height. Defaults to "6px"
     */
    height?: Property.Height<number>
    /**
     * Width of the outer box that appears on top of edges, used to represent the click-box for this handle. Should be larger than {@link width}. Defaults to 15px
     */
    outerBoxWidth?: Property.Padding<number>
    /**
     * Height of the outer box that appears on top of edges, used to represent the click-box for this handle. Should be larger than {@link height}. Defaults to 15px
     */
    outerBoxHeight?: Property.Padding<number>
    /**
     * Optional content for the node
     */
    children?: React.ReactNode
    /**
     * As the handles are placed outside the `NodeContent` node, their top/left CSS properties will be relative to the  node's border-box (basically, the handle's center
     * point will be on the outside edge of the node's border). This doesn't look great, and this is what this prop is for. Possible values:
     * - "normal" - handle positioning will take half of the node's borders into account. For example, using `left = 0` or `left = '100%'` will place this
     * handle's center point in the middle of the border (middle on its thickness axis).
     * - "inner" - handle positioning will use the node's `content-box`. For example, using `left = 0` will place this handle's center point on the
     * very inside edge of the node's border, so that half of this handle will be inside the node, and half will be on top of its border.
     * - "disable" - `top` and `left` props will be passed to CSS directly, unmodified. This way, the handle's center point will be on the outer edge of the
     * node's border.
     *
     * Note: this prop also applies if you are using the `position` prop instead of `top`/`left`.
     *
     * Defaults to "normal"
     */
    useNodeBorderBox?: "normal" | "inner" | "disable"
}

export interface NodeHandlePropsPositioned extends NodeHandlePropsBase {
    /**
     * Choose a preset position for this Handle, from the existing presets, or use the variable position format `<side>:<percentage>`.
     * 'Side' can be top/right/bottom/left/ellipse, and 'percentage' represents where along this side the Handle is placed, in clockwise direction:
     * - "top-left" is the same as "top:0" and "left:100"
     * - "top-right" is the same as "right:0" and "top:100"
     * - "bottom-right" is the same as "bottom:0" and "right:100"
     * - "bottom-left" is the same as "left:0" and "bottom:100"
     * - "left-bottom-left" is the same as "left:25", etc.
     *
     * _Note: this is true if there is no border radius; see below on how that is treated._
     *
     * - "ellipse: special value that will treat this node as an ellipse (you should use this with `border-radius: 50%`) and place this node along the eclipse,
     * where a percentage of 0% or 100% means top, 25% means right, 50% bottom and 75% left.
     *
     * Also, if {@link name} is not provided, there *is* a difference between using "top-left" and "top:0", as then the name gets automatically set to the value
     * provided to "position", which affects how you programmatically connect edges to a handle by name.
     *
     * Using this prop also takes border radius into account, by shifting the handle perpendicular to the side for non-corner preset or
     * `<side>:<percentage>` positions, and placing the node in the middle of the arc for corner preset positions.
     *
     * You can also use the 'top' and 'left' props instead of 'position' to set the position manually anywhere on the node with any CSS values.
     */
    position: "top-left" | "top-left-top" | "top" | "top-right-top" | "top-right" | "top-right-right" | "right" | "bottom-right-right" | "bottom-right"
        // eslint-disable-next-line @typescript-eslint/ban-types
        | "bottom-right-bottom" | "bottom" | "bottom-left-bottom" | "bottom-left" | "bottom-left-left" | "left" | "top-left-left" | "ellipse" | string & {}
}

export const HandlePresetToVariablePosition = {
    "top-left-top": "top:25",
    "top": "top:50",
    "top-right-top": "top:75",
    "top-right-right": "right:25",
    "right": "right:50",
    "bottom-right-right": "right:75",
    "bottom-right-bottom": "bottom:25",
    "bottom": "bottom-50",
    "bottom-left-bottom": "bottom-75",
    "bottom-left-left": "left:25",
    "left": "left:50",
    "top-left-left": "left:75",
}

export interface NodeHandlePropsTopLeft extends NodeHandlePropsBase {
    /**
     * Manually set the position of this handle with CSS values. Note that, if you use a percentage, you might want to use {@link useNodeBorderBox}
     * to make the handle actually appear on the border, not next to it.
     * @see NodeHandleProps.position
     */
    top: Property.Top<number>
    /**
     * Manually set the position of this handle with CSS values.Note that, if you use a percentage, you might want to use {@link useNodeBorderBox}
     * to make the handle actually appear on the border, not next to it.
     * @see NodeHandleProps.position
     */
    left: Property.Left<number>
}

type HandleDivProps = { width: Property.Width<number> | undefined, height: Property.Height<number> | undefined }

const HandleDiv = styled.div<HandleDivProps>`
  position: absolute;
  width: ${props => convertToCSSLength(props.width ?? 6)};
  height: ${props => convertToCSSLength(props.height ?? 6)};
`

const HandleBoxDiv = styled.div<HandleDivProps>`
  z-index: ${Z_INDEX_HANDLE_BOX};
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: ${props => convertToCSSLength(props.width ?? 15)};
  height: ${props => convertToCSSLength(props.height ?? 15)};
`

export function NodeHandle(props: NodeHandleProps) {
    let customPosition: { top: string, left: string } | undefined
    let position: string | undefined = undefined, name = props.name
    if ("top" in props) customPosition = {
        top: convertToCSSLength(props.top),
        left: convertToCSSLength(props.left),
    }; else {
        position = props.position
        if (name == null) name = position
    }

    const useNodeBorder = props.useNodeBorderBox === "normal" || props.useNodeBorderBox === undefined ? "normal"
        : props.useNodeBorderBox === "inner" ? "inner": undefined

    return <HandleDiv className={cx(NODE_HANDLE_CLASS, props.className)} style={customPosition} data-position={position}
                      data-name={name} data-role={Array.isArray(props.role) ? props.role.join() : props.role} data-use-node-border={useNodeBorder}
                      width={props.width} height={props.height}>
        <HandleBoxDiv className={NODE_HANDLE_CLASS_BOX} width={props.outerBoxWidth} height={props.outerBoxHeight}>
            {props.children}
        </HandleBoxDiv>
    </HandleDiv>
}