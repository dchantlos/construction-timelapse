import{aX as tt,G as r,d3 as go,kB as I,rr as _o,km as en,kp as ho,t0 as j,wP as J,wQ as ie,wR as Xt,wS as Q,wT as me,wU as ne,iw as he,eH as ci,q6 as bn,d4 as yo,iv as xo,d5 as So,eJ as Tn,eI as di,wV as wn,wW as bo,wX as tn,wY as To,gp as mt,d7 as nn,r as Ai,eG as on,iJ as an,q as wo,uP as Oo,n6 as zo,uT as Io,wZ as Co}from"./embed-C3boqIWz.js";import{g as m,C as a,c as g,r as G,$ as k,j as H,k as $,V as On,d as Y,J as Ao,u as Ve,a6 as Tt,a as Ke,_ as S,F as Rt,O as W,P as St,e as D,X as N,x,a7 as Se,f as v,K as le,D as M,I as Ft,a8 as Jt,w as Qt,N as Ri,t as pe,H as ce,G as F,A as B,a9 as de,U as Le,b as it,q as nt,a1 as pi,p as _e,aa as Vt,ab as Po,E as ee,ac as Vo,z as ei,Q as te,B as ot,ad as hi,y as at,ae as zn,m as _t,af as In,R as qe,Y as ge,n as C,ag as rn,o as sn,s as Cn,v as An,S as Pn,a0 as Fi,W as qt,ah as Do,T as Ro,ai as Fo,aj as Eo,Z as Lo,ak as Mo}from"./WGLContainer-BUoE_wXB.js";import{o as ye,g as No,r as ln,e as un,a as ii}from"./gradientStrokeConstants-DBVurMyz.js";import{M as fe,L as Vn,K as X,F as $o,e as cn,p as Dn,g as dn,o as Zi,u as Rn,A as Bo,r as Ho,s as Go,f as ko,z as Yo,J as Wo,I as Uo,H as Zo,D as qo,E as pn,B as jo,C as Ko}from"./constants-Cyw2BPc7.js";import{B as Xo,q as Pi,A as Jo,h as K,g as Qo,x as je,C as yi,k as rt,z as ea,w as fn,D as mn,E as ni}from"./utils-D_EV-5My.js";import{s as ta}from"./SimpleMesh-Cf6gtxh-.js";import{s as ia,i as Fn,p as En}from"./VertexArrayObject-DLRj-uUd.js";import{f as na,s as oa}from"./loadUtils-DitdOjd-.js";import{i as aa,o as ra}from"./constants-Cu4aojnZ.js";import{e as sa}from"./ShaderCompiler-G2XYGDs6.js";let la=class{get forceStaticPath(){return tt("esri-cim-animations-enable-status")==="disabled"}get forceAnimatedPath(){return tt("esri-cim-animations-enable-status")==="forced"}get freezeGlobalTime(){return tt("esri-cim-animations-freeze-time")??!1}get spotlightAnimatedSymbols(){return!!tt("esri-cim-animations-spotlight")}get forceGlobalTimeOrigin(){return tt("esri-cim-animations-freeze-time")!==!1}};const qi=new la,ua={bitBlit:{"bitBlit.frag":`uniform lowp sampler2D u_tex;
uniform lowp float u_opacity;
varying mediump vec2 v_uv;
void main() {
lowp vec4 color = texture2D(u_tex, v_uv);
gl_FragColor = color * u_opacity;
}`,"bitBlit.vert":`attribute vec2 a_pos;
attribute vec2 a_tex;
varying mediump vec2 v_uv;
void main(void) {
gl_Position = vec4(a_pos , 0.0, 1.0);
v_uv = a_tex;
}`},debug:{overlay:{"overlay.frag":`precision mediump float;
varying vec4 v_color;
void main(void) {
gl_FragColor = v_color;
}`,"overlay.vert":`attribute vec3 a_PositionAndFlags;
uniform mat3 u_dvsMat3;
uniform vec4 u_colors[4];
uniform float u_opacities[4];
varying vec4 v_color;
void main(void) {
vec2 position = a_PositionAndFlags.xy;
float flags = a_PositionAndFlags.z;
int colorIndex = int(mod(flags, 4.0));
vec4 color;
for (int i = 0; i < 4; i++) {
color = u_colors[i];
if (i == colorIndex) {
break;
}
}
int opacityIndex = int(mod(floor(flags / 4.0), 4.0));
float opacity;
for (int i = 0; i < 4; i++) {
opacity = u_opacities[i];
if (i == opacityIndex) {
break;
}
}
v_color = color * opacity;
gl_Position = vec4((u_dvsMat3 * vec3(position, 1.0)).xy, 0.0, 1.0);
}`}},dot:{dot:{"dot.frag":`precision mediump float;
varying vec4 v_color;
varying float v_dotRatio;
varying float v_invEdgeRatio;
uniform highp float u_tileZoomFactor;
void main()
{
float dist = length(gl_PointCoord - vec2(.5, .5)) * 2.;
float alpha = smoothstep(0., 1., v_invEdgeRatio * (dist - v_dotRatio) + 1.);
gl_FragColor = v_color * alpha;
}`,"dot.vert":`precision highp float;
attribute vec2 a_pos;
uniform sampler2D u_texture;
uniform highp mat3 u_dvsMat3;
uniform highp float u_tileZoomFactor;
uniform highp float u_dotSize;
uniform highp float u_pixelRatio;
varying vec2 v_pos;
varying vec4 v_color;
varying float v_dotRatio;
varying float v_invEdgeRatio;
const float EPSILON = 0.000001;
void main()
{
mat3 tileToTileTexture = mat3(  1., 0., 0.,
0., -1., 0.,
0., 1., 1.  );
vec3 texCoords = tileToTileTexture * vec3(a_pos.xy / 512., 1.);
v_color = texture2D(u_texture, texCoords.xy);
float smoothEdgeWidth = max(u_dotSize / 2., 1.) ;
float z = 0.;
z += 2.0 * step(v_color.a, EPSILON);
gl_PointSize = (smoothEdgeWidth + u_dotSize);
gl_Position = vec4((u_dvsMat3 * vec3(a_pos + .5, 1.)).xy, z, 1.);
v_dotRatio = u_dotSize / gl_PointSize;
v_invEdgeRatio = -1. / ( smoothEdgeWidth / gl_PointSize );
gl_PointSize  *= (u_pixelRatio * u_tileZoomFactor);
}`}},filtering:{"bicubic.glsl":`vec4 computeWeights(float v) {
float b = 1.0 / 6.0;
float v2 = v * v;
float v3 = v2 * v;
float w0 = b * (-v3 + 3.0 * v2 - 3.0 * v + 1.0);
float w1 = b * (3.0 * v3  - 6.0 * v2 + 4.0);
float w2 = b * (-3.0 * v3 + 3.0 * v2 + 3.0 * v + 1.0);
float w3 = b * v3;
return vec4(w0, w1, w2, w3);
}
vec4 bicubicOffsetsAndWeights(float v) {
vec4 w = computeWeights(v);
float g0 = w.x + w.y;
float g1 = w.z + w.w;
float h0 = 1.0 - (w.y / g0) + v;
float h1 = 1.0 + (w.w / g1) - v;
return vec4(h0, h1, g0, g1);
}
vec4 sampleBicubicBSpline(sampler2D sampler, vec2 coords, vec2 texSize) {
vec2 eX = vec2(1.0 / texSize.x, 0.0);
vec2 eY = vec2(0.0, 1.0 / texSize.y);
vec2 texel = coords * texSize - 0.5;
vec3 hgX = bicubicOffsetsAndWeights(fract(texel).x).xyz;
vec3 hgY = bicubicOffsetsAndWeights(fract(texel).y).xyz;
vec2 coords10 = coords + hgX.x * eX;
vec2 coords00 = coords - hgX.y * eX;
vec2 coords11 = coords10 + hgY.x * eY;
vec2 coords01 = coords00 + hgY.x * eY;
coords10 = coords10 - hgY.y * eY;
coords00 = coords00 - hgY.y * eY;
vec4 color00 = texture2D(sampler, coords00);
vec4 color10 = texture2D(sampler, coords10);
vec4 color01 = texture2D(sampler, coords01);
vec4 color11 = texture2D(sampler, coords11);
color00 = mix(color00, color01, hgY.z);
color10 = mix(color10, color11, hgY.z);
color00 = mix(color00, color10, hgX.z);
return color00;
}`,"bilinear.glsl":`vec4 sampleBilinear(sampler2D sampler, vec2 coords, vec2 texSize) {
vec2 texelStart = floor(coords * texSize);
vec2 coord0 = texelStart / texSize;
vec2 coord1 = (texelStart +  vec2(1.0, 0.0)) / texSize;
vec2 coord2 = (texelStart +  vec2(0.0, 1.0)) / texSize;
vec2 coord3 = (texelStart +  vec2(1.0, 1.0)) / texSize;
vec4 color0 = texture2D(sampler, coord0);
vec4 color1 = texture2D(sampler, coord1);
vec4 color2 = texture2D(sampler, coord2);
vec4 color3 = texture2D(sampler, coord3);
vec2 blend = fract(coords * texSize);
vec4 color01 = mix(color0, color1, blend.x);
vec4 color23 = mix(color2, color3, blend.x);
vec4 color = mix(color01, color23, blend.y);
#ifdef NNEDGE
float alpha = floor(color0.a * color1.a * color2.a * color3.a + 0.5);
color = color * alpha + (1.0 - alpha) * texture2D(sampler, coords);
#endif
return color;
}`,"epx.glsl":`vec4 sampleEPX(sampler2D sampler, float size, vec2 coords, vec2 texSize) {
vec2 invSize = 1.0 / texSize;
vec2 texel = coords * texSize;
vec2 texel_i = floor(texel);
vec2 texel_frac = fract(texel);
vec4 colorP = texture2D(sampler, texel_i * invSize);
vec4 colorP1 = vec4(colorP);
vec4 colorP2 = vec4(colorP);
vec4 colorP3 = vec4(colorP);
vec4 colorP4 = vec4(colorP);
vec4 colorA = texture2D(sampler, (texel_i - vec2(0.0, 1.0)) * invSize);
vec4 colorB = texture2D(sampler, (texel_i + vec2(1.0, 0.0)) * invSize);
vec4 colorC = texture2D(sampler, (texel_i - vec2(1.0, 0.0)) * invSize);
vec4 colorD = texture2D(sampler, (texel_i + vec2(0.0, 1.0)) * invSize);
if (colorC == colorA && colorC != colorD && colorA != colorB) {
colorP1 = colorA;
}
if (colorA == colorB && colorA != colorC && colorB != colorD) {
colorP2 = colorB;
}
if (colorD == colorC && colorD != colorB && colorC != colorA) {
colorP3 = colorC;
}
if (colorB == colorD && colorB != colorA && colorD != colorC) {
colorP4 = colorD;
}
vec4 colorP12 = mix(colorP1, colorP2, texel_frac.x);
vec4 colorP34 = mix(colorP1, colorP2, texel_frac.x);
return mix(colorP12, colorP34, texel_frac.y);
}`},heatmap:{heatmapResolve:{"heatmapResolve.frag":`precision highp float;
#ifdef HEATMAP_PRECISION_HALF_FLOAT
#define COMPRESSION_FACTOR 4.0
#else
#define COMPRESSION_FACTOR 1.0
#endif
uniform sampler2D u_texture;
uniform sampler2D u_gradient;
uniform vec2 u_densityMinAndInvRange;
uniform float u_densityNormalization;
varying vec2 v_uv;
void main() {
vec4 data = texture2D(u_texture, v_uv);
float density = data.r * COMPRESSION_FACTOR;
density *= u_densityNormalization;
density = (density - u_densityMinAndInvRange.x) * u_densityMinAndInvRange.y;
vec4 color = texture2D(u_gradient, vec2(density, 0.5));
gl_FragColor = vec4(color.rgb * color.a, color.a);
}`,"heatmapResolve.vert":`precision highp float;
attribute vec2 a_pos;
varying vec2 v_uv;
void main() {
v_uv = a_pos;
gl_Position = vec4(a_pos * 2.0 - 1.0, 1., 1.);
}`}},highlight:{"blur.frag":`varying mediump vec2 v_texcoord;
uniform mediump vec4 u_direction;
uniform mediump mat4 u_channelSelector;
uniform mediump float u_sigma;
uniform sampler2D u_texture;
mediump float gauss1(mediump vec2 dir) {
return exp(-dot(dir, dir) / (2.0 * u_sigma * u_sigma));
}
mediump vec4 selectChannel(mediump vec4 sample) {
return u_channelSelector * sample;
}
void accumGauss1(mediump float i, inout mediump float tot, inout mediump float weight) {
mediump float w = gauss1(i * u_direction.xy);
tot += selectChannel(texture2D(u_texture, v_texcoord + i * u_direction.zw))[3] * w;
weight += w;
}
void main(void) {
mediump float tot = 0.0;
mediump float weight = 0.0;
accumGauss1(-5.0, tot, weight);
accumGauss1(-4.0, tot, weight);
accumGauss1(-3.0, tot, weight);
accumGauss1(-2.0, tot, weight);
accumGauss1(-1.0, tot, weight);
accumGauss1(0.0, tot, weight);
accumGauss1(1.0, tot, weight);
accumGauss1(2.0, tot, weight);
accumGauss1(3.0, tot, weight);
accumGauss1(4.0, tot, weight);
accumGauss1(5.0, tot, weight);
gl_FragColor = vec4(0.0, 0.0, 0.0, tot / weight);
}`,"highlight.frag":`varying mediump vec2 v_texcoord;
uniform sampler2D u_texture;
uniform mediump float u_sigma;
uniform sampler2D u_shade;
uniform mediump vec2 u_minMaxDistance;
mediump float estimateDistance() {
mediump float y = texture2D(u_texture, v_texcoord)[3];
const mediump float y0 = 0.5;
mediump float m0 = 1.0 / (sqrt(2.0 * 3.1415) * u_sigma);
mediump float d = (y - y0) / m0;
return d;
}
mediump vec4 shade(mediump float d) {
mediump float mappedDistance = (d - u_minMaxDistance.x) / (u_minMaxDistance.y - u_minMaxDistance.x);
mappedDistance = clamp(mappedDistance, 0.0, 1.0);
return texture2D(u_shade, vec2(mappedDistance, 0.5));
}
void main(void) {
mediump float d = estimateDistance();
gl_FragColor = shade(d);
}`,"textured.vert":`attribute mediump vec2 a_position;
attribute mediump vec2 a_texcoord;
varying mediump vec2 v_texcoord;
void main(void) {
gl_Position = vec4(a_position, 0.0, 1.0);
v_texcoord = a_texcoord;
}`},materials:{"attributeData.glsl":`uniform highp sampler2D filterFlags;
uniform highp sampler2D animation;
uniform highp sampler2D gpgpu;
uniform highp sampler2D visualVariableData;
uniform highp sampler2D dataDriven0;
uniform highp sampler2D dataDriven1;
uniform highp sampler2D dataDriven2;
uniform float size;
highp vec2 getAttributeDataCoords(in highp vec3 id) {
highp vec3  texel = unpackDisplayIdTexel(id);
highp float u32 = float(int(texel.r) + int(texel.g) * 256 + int(texel.b) * 256 * 256);
highp float col = mod(u32, size);
highp float row = (u32 - col) / size;
highp float u = col / size;
highp float v = row / size;
return vec2(u, v);
}
highp vec2 getAttributeDataTextureCoords(in highp vec3 id) {
return (getAttributeDataCoords(id) * 2.0) - 1.0 + (.5 / vec2(size));
}
highp vec4 getFilterData(in highp vec3 id) {
vec2 coords = getAttributeDataCoords(id);
return texture2D(filterFlags, coords);
}
highp vec4 getAnimation(in highp vec3 id) {
highp vec2 coords = getAttributeDataCoords(id);
return texture2D(animation, coords);
}
highp vec4 getVisualVariableData(in highp vec3 id) {
highp vec2 coords = getAttributeDataCoords(id);
return texture2D(visualVariableData, coords);
}
highp vec4 getDataDriven0(in highp vec3 id) {
highp vec2 coords = getAttributeDataCoords(id);
return texture2D(dataDriven0, coords);
}
highp vec4 getDataDriven1(in highp vec3 id) {
highp vec2 coords = getAttributeDataCoords(id);
return texture2D(dataDriven1, coords);
}
highp vec4 getGPGPU(in highp vec3 id) {
highp vec2 coords = getAttributeDataCoords(id);
return texture2D(gpgpu, coords);
}
highp vec4 getDataDriven2(in highp vec3 id) {
highp vec2 coords = getAttributeDataCoords(id);
return texture2D(dataDriven2, coords);
}
float u88VVToFloat(in vec2 v) {
bool isMagic = v.x == 255.0 && v.y == 255.0;
if (isMagic) {
return NAN_MAGIC_NUMBER;
}
return (v.x + v.y * float(0x100)) - 32768.0;
}`,"barycentric.glsl":`float inTriangle(vec3 bary) {
vec3 absBary = abs(bary);
return step((absBary.x + absBary.y + absBary.z), 1.05);
}
vec3 xyToBarycentric(in vec2 pos, in vec2 v0,  in vec2 v1, in vec2 v2) {
mat3 xyToBarycentricMat3 = mat3(
v1.x * v2.y - v2.x * v1.y, v2.x * v0.y - v0.x * v2.y, v0.x * v1.y - v1.x * v0.y,
v1.y - v2.y, v2.y - v0.y, v0.y - v1.y,
v2.x - v1.x, v0.x - v2.x, v1.x - v0.x
);
float A2 = v0.x * (v1.y - v2.y) + v1.x * (v2.y - v0.y) + v2.x * (v0.y - v1.y);
return (1. / A2) * xyToBarycentricMat3 * vec3(1., pos);
}`,"constants.glsl":`const float C_DEG_TO_RAD = 3.14159265359 / 180.0;
const float C_256_TO_RAD = 3.14159265359 / 128.0;
const float C_RAD_TO_DEG = 180.0 / 3.141592654;
const float POSITION_PRECISION = 1.0 / 8.0;
const float FILL_POSITION_PRECISION = 1.0 / 1.0;
const float SOFT_EDGE_RATIO = 1.0;
const float THIN_LINE_WIDTH_FACTOR = 1.1;
const float THIN_LINE_HALF_WIDTH = 1.0;
const float EXTRUDE_SCALE_PLACEMENT_PADDING = 1.0 / 4.0;
const float OFFSET_PRECISION = 1.0 / 8.0;
const float OUTLINE_SCALE = 1.0 / 5.0;
const float SDF_FONT_SIZE = 24.0;
const float MAX_SDF_DISTANCE = 8.0;
const float PLACEMENT_PADDING = 8.0;
const float EPSILON = 0.00001;
const float EPSILON_HITTEST = 0.05;
const int MAX_FILTER_COUNT = 2;
const int ATTR_VV_SIZE = 0;
const int ATTR_VV_COLOR = 1;
const int ATTR_VV_OPACITY = 2;
const int ATTR_VV_ROTATION = 3;
const highp float NAN_MAGIC_NUMBER = 1e-30;
const int BITSET_GENERIC_LOCK_COLOR = 1;
const int BITSET_GENERIC_CONSIDER_ALPHA_ONLY = 4;
const int BITSET_MARKER_ALIGNMENT_MAP = 0;
const int BITSET_MARKER_OUTLINE_ALLOW_COLOR_OVERRIDE = 2;
const int BITSET_MARKER_SCALE_SYMBOLS_PROPORTIONALLY = 3;
const int BITSET_TYPE_FILL_OUTLINE = 0;
const int BITSET_FILL_RANDOM_PATTERN_OFFSET = 2;
const int BITSET_FILL_HAS_UNRESOLVED_REPLACEMENT_COLOR = 3;
const int BITSET_FILL_HAS_PATTERN_HEIGHT_PRECISION_FACTOR = 5;
const int BITSET_FILL_HAS_PATTERN_WIDTH_PRECISION_FACTOR = 6;
const int BITSET_LINE_SCALE_DASH = 2;`,fill:{"common.glsl":`#include <materials/symbologyTypeUtils.glsl>
#ifdef PATTERN
uniform mediump vec2 u_mosaicSize;
varying mediump float v_sampleAlphaOnly;
#endif
#if SYMBOLOGY_TYPE == SYMBOLOGY_TYPE_DOT_DENSITY
uniform lowp vec4 u_isActive[ 2 ];
uniform highp float u_dotValue;
uniform highp float u_tileDotsOverArea;
uniform highp float u_dotTextureDotCount;
uniform mediump float u_tileZoomFactor;
#endif
varying highp vec3 v_id;
varying lowp vec4 v_color;
varying lowp float v_opacity;
varying mediump vec4 v_aux1;
#ifdef PATTERN
varying mediump vec2 v_tileTextureCoord;
#endif
#ifdef SYMBOLOGY_TYPE_IS_OUTLINE_FILL_LIKE
varying lowp float v_isOutline;
#endif
#if SYMBOLOGY_TYPE == SYMBOLOGY_TYPE_DOT_DENSITY
varying highp vec2 v_dotTextureCoords;
varying highp vec4 v_dotThresholds[ 2 ];
#endif`,"fill.frag":`precision highp float;
#include <materials/constants.glsl>
#include <materials/utils.glsl>
#include <materials/fill/common.glsl>
#ifdef PATTERN
uniform lowp sampler2D u_texture;
#endif
#if SYMBOLOGY_TYPE == SYMBOLOGY_TYPE_DOT_DENSITY
uniform mediump mat4 u_dotColors[ 2 ];
uniform sampler2D u_dotTextures[ 2 ];
uniform vec4 u_dotBackgroundColor;
#endif
#ifdef SYMBOLOGY_TYPE_IS_OUTLINE_FILL_LIKE
#include <materials/shared/line/common.glsl>
#include <materials/shared/line/line.frag>
lowp vec4 drawLine() {
float v_lineWidth = v_aux1.x;
vec2  v_normal    = v_aux1.yz;
LineData inputs = LineData(
v_color,
v_normal,
v_lineWidth,
v_opacity,
v_id
);
return shadeLine(inputs);
}
#endif
lowp vec4 drawFill() {
lowp vec4 out_color = vec4(0.);
#ifdef HITTEST
out_color = v_color;
#elif defined(PATTERN)
mediump vec4 v_tlbr = v_aux1;
mediump vec2 normalizedTextureCoord = mod(v_tileTextureCoord, 1.0);
mediump vec2 samplePos = mix(v_tlbr.xy, v_tlbr.zw, normalizedTextureCoord);
lowp vec4 color = texture2D(u_texture, samplePos);
if (v_sampleAlphaOnly > 0.5) {
color.rgb = vec3(color.a);
}
out_color = v_opacity * v_color * color;
#elif SYMBOLOGY_TYPE == SYMBOLOGY_TYPE_DOT_DENSITY && !defined(HIGHLIGHT)
vec4 textureThresholds0 = texture2D(u_dotTextures[0], v_dotTextureCoords);
vec4 textureThresholds1 = texture2D(u_dotTextures[1], v_dotTextureCoords);
vec4 difference0 = v_dotThresholds[0] - textureThresholds0;
vec4 difference1 = v_dotThresholds[1] - textureThresholds1;
#ifdef DD_DOT_BLENDING
vec4 isPositive0 = step(0.0, difference0);
vec4 isPositive1 = step(0.0, difference1);
float weightSum = dot(isPositive0, difference0) + dot(isPositive1, difference1);
float lessThanEqZero = step(weightSum, 0.0);
float greaterThanZero = 1.0 - lessThanEqZero ;
float divisor = (weightSum + lessThanEqZero);
vec4 weights0 = difference0 * isPositive0 / divisor;
vec4 weights1 = difference1 * isPositive1 / divisor;
vec4 dotColor = u_dotColors[0] * weights0 + u_dotColors[1] * weights1;
vec4 preEffectColor = greaterThanZero * dotColor + lessThanEqZero * u_dotBackgroundColor;
#else
float diffMax = max(max4(difference0), max4(difference1));
float lessThanZero = step(diffMax, 0.0);
float greaterOrEqZero = 1.0 - lessThanZero;
vec4 isMax0 = step(diffMax, difference0);
vec4 isMax1 = step(diffMax, difference1);
vec4 dotColor = u_dotColors[0] * isMax0 + u_dotColors[1] * isMax1;
vec4 preEffectColor = greaterOrEqZero * dotColor + lessThanZero * u_dotBackgroundColor;
#endif
out_color = preEffectColor;
#else
out_color = v_opacity * v_color;
#endif
#ifdef HIGHLIGHT
out_color.a = 1.0;
#endif
return out_color;
}
void main() {
#ifdef SYMBOLOGY_TYPE_IS_OUTLINE_FILL_LIKE
if (v_isOutline > 0.5) {
gl_FragColor = drawLine();
} else {
gl_FragColor = drawFill();
}
#else
gl_FragColor = drawFill();
#endif
}`,"fill.vert":`#include <materials/symbologyTypeUtils.glsl>
#define PACKED_LINE
precision highp float;
attribute float a_bitset;
#if SYMBOLOGY_TYPE == SYMBOLOGY_TYPE_DOT_DENSITY
attribute float a_inverseArea;
vec4 a_color = vec4(0.0, 0.0, 0.0, 1.0);
vec2 a_zoomRange = vec2(0.0, 10000.0);
#else
attribute vec4 a_color;
attribute vec4 a_aux2;
attribute vec4 a_aux3;
#ifndef SYMBOLOGY_TYPE_IS_SIMPLE_LIKE
attribute vec4 a_aux1;
attribute vec2 a_zoomRange;
#else
vec2 a_zoomRange = vec2(0.0, 10000.0);
#endif
#endif
uniform vec2 u_tileOffset;
uniform vec2 u_maxIntNumOfCrossing;
#include <util/encoding.glsl>
#include <materials/vcommon.glsl>
#include <materials/fill/common.glsl>
#include <materials/fill/hittest.glsl>
const float INV_SCALE_COMPRESSION_FACTOR = 1.0 / 128.0;
const float MAX_REPRESENTABLE_INT = 16777216.0;
#if SYMBOLOGY_TYPE == SYMBOLOGY_TYPE_DOT_DENSITY
vec4 dotThreshold(vec4 featureAttrOverFeatureArea, float dotValue, float tileDotsOverArea) {
return featureAttrOverFeatureArea * (1.0 / dotValue)  * (1.0 / tileDotsOverArea);
}
#endif
#ifdef SYMBOLOGY_TYPE_IS_OUTLINE_FILL_LIKE
#include <materials/shared/line/common.glsl>
#include <materials/shared/line/line.vert>
void drawLine(out lowp vec4 out_color, out highp vec3 out_pos) {
LineData outputs = buildLine(
out_pos,
a_id,
a_pos,
a_color,
(a_aux3.xy - 128.) / 16.,
(a_aux3.zw - 128.) / 16.,
0.,
a_aux2.z / 16.,
a_bitset,
vec4(0.),
vec2(0.),
a_aux2.w / 16.
);
v_id      = outputs.id;
v_opacity = outputs.opacity;
v_aux1    = vec4(outputs.lineHalfWidth, outputs.normal, 0.);
out_color = outputs.color;
}
#endif
void drawFill(out lowp vec4 out_color, out highp vec3 out_pos) {
float a_bitSet = a_bitset;
out_color = getColor(a_color, a_bitSet, BITSET_GENERIC_LOCK_COLOR);
v_opacity = getOpacity();
v_id      = norm(a_id);
#if SYMBOLOGY_TYPE == SYMBOLOGY_TYPE_DOT_DENSITY
mat3 tileToTileNormalized = mat3(  2. / 512.,  0.,  0.,
0., -2. / 512.,  0.,
-1.,  1.,  1.  );
out_pos   = tileToTileNormalized * vec3((a_pos * FILL_POSITION_PRECISION), 1.);
#else
out_pos   = u_dvsMat3 * vec3(a_pos * FILL_POSITION_PRECISION, 1.);
#endif
#ifdef PATTERN
vec4  a_tlbr   = a_aux1;
float a_width  = a_aux2.x;
float a_height = a_aux2.y;
vec2  a_offset = a_aux2.zw;
vec2  a_scale  = a_aux3.xy;
float a_angle  = a_aux3.z;
if (getBit(a_bitset, BITSET_FILL_HAS_PATTERN_WIDTH_PRECISION_FACTOR) > 0.5) {
a_width *= INV_SCALE_COMPRESSION_FACTOR;
}
if (getBit(a_bitset, BITSET_FILL_HAS_PATTERN_HEIGHT_PRECISION_FACTOR) > 0.5) {
a_height *= INV_SCALE_COMPRESSION_FACTOR;
}
vec2 scale = INV_SCALE_COMPRESSION_FACTOR * a_scale;
float width = u_zoomFactor * a_width * scale.x;
float height = u_zoomFactor * a_height * scale.y;
float angle = C_256_TO_RAD * a_angle;
float sinA = sin(angle);
float cosA = cos(angle);
float dx = 0.0;
float dy = 0.0;
if (getBit(a_bitset, BITSET_FILL_RANDOM_PATTERN_OFFSET) > 0.5) {
float id = rgba2float(vec4(a_id, 0.0));
dx = rand(vec2(id, 0.0));
dy = rand(vec2(0.0, id));
}
mat3 patternMatrix = mat3(cosA / width, sinA / height, 0,
-sinA / width, cosA / height, 0,
dx,            dy,           1);
vec2 patternSize = vec2(a_width, a_height);
vec2 numPatternsPerMaxInt = vec2(MAX_REPRESENTABLE_INT) / patternSize;
vec2 maxIntCrossingOffsetCorrection = patternSize * fract(u_maxIntNumOfCrossing * numPatternsPerMaxInt);
vec2 tileOffset = u_tileOffset + maxIntCrossingOffsetCorrection - 0.5 * patternSize;
tileOffset = vec2(tileOffset.x * cosA - tileOffset.y * sinA, tileOffset.x * sinA + tileOffset.y * cosA);
tileOffset = mod(tileOffset, patternSize);
vec2 symbolOffset = u_zoomFactor * scale * vec2(a_offset - tileOffset) / vec2(width, height);
v_tileTextureCoord = (patternMatrix * vec3(a_pos * FILL_POSITION_PRECISION, 1.0)).xy - symbolOffset;
v_aux1 = a_tlbr / u_mosaicSize.xyxy;
v_sampleAlphaOnly = getBit(a_bitset, BITSET_GENERIC_CONSIDER_ALPHA_ONLY);
if (getBit(a_bitSet, BITSET_FILL_HAS_UNRESOLVED_REPLACEMENT_COLOR) > 0.5) {
#ifdef VV_COLOR
v_sampleAlphaOnly *= (1.0 - float(isNan(VV_ADATA[ATTR_VV_COLOR]))) * (1.0 - getBit(a_bitSet, BITSET_GENERIC_LOCK_COLOR));
#else
v_sampleAlphaOnly = 0.0;
#endif
}
#elif SYMBOLOGY_TYPE == SYMBOLOGY_TYPE_DOT_DENSITY
vec4 ddAttributeData0 = getAttributeData2(a_id) * u_isActive[0] * a_inverseArea;
vec4 ddAttributeData1 = getAttributeData3(a_id) * u_isActive[1] * a_inverseArea;
float size = u_tileZoomFactor * 512.0 * 1.0 / u_pixelRatio;
v_dotThresholds[0] = dotThreshold(ddAttributeData0, u_dotValue, u_tileDotsOverArea);
v_dotThresholds[1] = dotThreshold(ddAttributeData1, u_dotValue, u_tileDotsOverArea);
v_dotTextureCoords = (a_pos * FILL_POSITION_PRECISION + 0.5) / size;
#endif
}
#ifdef HITTEST
void draw(out lowp vec4 out_color, out highp vec3 out_pos) {
#ifdef SYMBOLOGY_TYPE_IS_OUTLINE_FILL_LIKE
if (getBit(a_bitset, BITSET_TYPE_FILL_OUTLINE) > 0.5) {
out_pos = vec3(0., 0., 2.);
return;
}
#endif
hittestFill(out_color, out_pos);
gl_PointSize = 1.0;
}
#elif defined(SYMBOLOGY_TYPE_IS_OUTLINE_FILL_LIKE)
void draw(out lowp vec4 out_color, out highp vec3 out_pos) {
v_isOutline = getBit(a_bitset, BITSET_TYPE_FILL_OUTLINE);
if (v_isOutline > 0.5) {
drawLine(out_color, out_pos);
} else {
drawFill(out_color, out_pos);
}
}
#else
#define draw drawFill
#endif
void main()
{
INIT;
highp vec3 pos  = vec3(0.);
highp vec4 color  = vec4(0.);
draw(color, pos);
v_color = color;
gl_Position = vec4(clip(v_color, pos, getFilterFlags(), a_zoomRange), 1.0);
}`,"hittest.glsl":`#ifdef HITTEST
#include <materials/hittest/common.glsl>
attribute vec2 a_pos1;
attribute vec2 a_pos2;
void hittestFill(
out lowp vec4 out_color,
out highp vec3 out_pos
) {
vec3 pos        = u_viewMat3 * u_tileMat3 * vec3(a_pos  * FILL_POSITION_PRECISION, 1.);
vec3 pos1       = u_viewMat3 * u_tileMat3 * vec3(a_pos1 * FILL_POSITION_PRECISION, 1.);
vec3 pos2       = u_viewMat3 * u_tileMat3 * vec3(a_pos2 * FILL_POSITION_PRECISION, 1.);
float hittestDist = u_hittestDist;
float dist = distPointTriangle(u_hittestPos, pos.xy, pos1.xy, pos2.xy);
out_pos = vec3(getAttributeDataTextureCoords(a_id), 0.0);
if (dist < 0. || dist >= hittestDist) {
out_pos.z += 2.0;
}
out_color = vec4(1. / 255., 0, 0, dist == 0. ? (1. / 255.) : 0.);
}
#endif`},hittest:{"common.glsl":`#ifdef HITTEST
uniform float hittestDist;
uniform highp vec2 hittestPos;
float projectScalar(vec2 a, vec2 b) {
return dot(a, normalize(b));
}
float distPointSegment(vec2 p0, vec2 p1, vec2 p2) {
vec2 L = p2 - p1;
vec2 A = p0 - p1;
float projAL = projectScalar(A, L);
float t = clamp(projAL / length(L), 0., 1.);
return distance(p0, p1 + t * (p2 - p1));
}
void hittestMarker(out lowp vec4 out_color, out highp vec3 out_pos, in highp vec3 pos, float size) {
float dist = distance(pos, vec3(hittestPos, 1.));
out_pos = vec3(getAttributeDataTextureCoords(a_id), 0.0);
if ((dist - size) > hittestDist) {
out_pos.z += 2.0;
}
out_color = vec4(1. / 255., 0, 0, (dist - size) < 0. ? (1. / 255.) : 0.);
}
float intersectPointTriangleBary(vec2 p, vec2 a, vec2 b, vec2 c) {
return inTriangle(xyToBarycentric(p, a, b, c));
}
float distPointTriangle(vec2 p, vec2 a, vec2 b, vec2 c) {
vec2 ba = b - a;
vec2 ca = c - a;
float crossProduct = ba.x * ca.y - ca.x * ba.y;
bool isParallel = crossProduct < EPSILON_HITTEST && crossProduct > -EPSILON_HITTEST;
if (isParallel) {
return -1.;
}
if (intersectPointTriangleBary(p.xy, a, b, c) == 1.) {
return 0.;
}
float distAB = distPointSegment(p, a, b);
float distBC = distPointSegment(p, b, c);
float distCA = distPointSegment(p, c, a);
return min(min(distAB, distBC), distCA);
}
#endif`},icon:{"common.glsl":`#include <util/encoding.glsl>
uniform lowp vec2 u_mosaicSize;
varying lowp vec4 v_color;
varying highp vec3 v_id;
varying highp vec4 v_sizeTex;
varying mediump vec3 v_pos;
varying lowp float v_opacity;
uniform lowp sampler2D u_texture;
#ifdef SDF
varying lowp vec4 v_outlineColor;
varying mediump float v_outlineWidth;
varying mediump float v_distRatio;
varying mediump float v_overridingOutlineColor;
varying mediump float v_isThin;
#endif
#ifdef SDF
vec4 getColor(vec2 v_size, vec2 v_tex) {
#ifdef HITTEST
lowp vec4 fillPixelColor = vec4(1.0);
#else
lowp vec4 fillPixelColor = v_color;
#endif
float d = 0.5 - rgba2float(texture2D(u_texture, v_tex));
float size = max(v_size.x, v_size.y);
float dist = d * size * SOFT_EDGE_RATIO * v_distRatio;
fillPixelColor *= clamp(0.5 - dist, 0.0, 1.0);
float outlineWidth = v_outlineWidth;
#ifdef HIGHLIGHT
outlineWidth = max(outlineWidth, 4.0 * v_isThin);
#endif
if (outlineWidth > 0.25) {
lowp vec4 outlinePixelColor = v_overridingOutlineColor * v_color + (1.0 - v_overridingOutlineColor) * v_outlineColor;
float clampedOutlineSize = min(outlineWidth, size);
outlinePixelColor *= clamp(0.5 - abs(dist) + clampedOutlineSize * 0.5, 0.0, 1.0);
return v_opacity * ((1.0 - outlinePixelColor.a) * fillPixelColor + outlinePixelColor);
}
return v_opacity * fillPixelColor;
}
#else
vec4 getColor(vec2 _v_size, vec2 v_tex) {
lowp vec4 texColor = texture2D(u_texture, v_tex);
return v_opacity * texColor * v_color;
}
#endif`,heatmapAccumulate:{"common.glsl":`varying lowp vec4 v_hittestResult;
varying mediump vec2 v_offsetFromCenter;
varying highp float v_fieldValue;`,"heatmapAccumulate.frag":`precision mediump float;
#include <materials/icon/heatmapAccumulate/common.glsl>
#ifdef HEATMAP_PRECISION_HALF_FLOAT
#define COMPRESSION_FACTOR 0.25
#else
#define COMPRESSION_FACTOR 1.0
#endif
uniform lowp sampler2D u_texture;
void main() {
#ifdef HITTEST
gl_FragColor = v_hittestResult;
#else
float radius = length(v_offsetFromCenter);
float shapeWeight = step(radius, 1.0);
float oneMinusRadiusSquared = 1.0 - radius * radius;
float kernelWeight = oneMinusRadiusSquared * oneMinusRadiusSquared;
gl_FragColor = vec4(shapeWeight * kernelWeight * v_fieldValue * COMPRESSION_FACTOR);
#endif
}`,"heatmapAccumulate.vert":`precision highp float;
attribute vec2 a_vertexOffset;
vec4 a_color = vec4(0.0);
vec2 a_zoomRange = vec2(0.0, 10000.0);
uniform float u_radius;
uniform float u_isFieldActive;
#include <materials/vcommon.glsl>
#include <materials/hittest/common.glsl>
#include <materials/icon/heatmapAccumulate/common.glsl>
void main() {
float filterFlags = getFilterFlags();
#ifdef HITTEST
highp vec4 out_hittestResult = vec4(0.);
highp vec3 out_pos = vec3(0.);
vec3 pos = u_viewMat3 * u_tileMat3 * vec3(a_pos * POSITION_PRECISION, 1.0);
hittestMarker(out_hittestResult, out_pos, pos, u_radius);
v_hittestResult = out_hittestResult;
gl_PointSize = 1.;
gl_Position = vec4(clip(a_color, out_pos, filterFlags, a_zoomRange), 1.0);
#else
v_offsetFromCenter = sign(a_vertexOffset);
v_fieldValue = getAttributeData2(a_id).x * u_isFieldActive + 1.0 - u_isFieldActive;
vec3 centerPos = u_dvsMat3 * vec3(a_pos * POSITION_PRECISION, 1.0);
vec3 vertexPos = centerPos + u_displayViewMat3 * vec3(v_offsetFromCenter, 0.0) * u_radius;
gl_Position = vec4(clip(a_color, vertexPos, filterFlags, a_zoomRange), 1.0);
#endif
}`},"hittest.glsl":`#ifdef HITTEST
#include <materials/hittest/common.glsl>
attribute vec2 a_vertexOffset1;
attribute vec2 a_vertexOffset2;
attribute vec2 a_texCoords1;
attribute vec2 a_texCoords2;
vec2 getTextureCoords(in vec3 bary, in vec2 texCoords0, in vec2 texCoords1, in vec2 texCoords2) {
return texCoords0 * bary.x + texCoords1 * bary.y + texCoords2 * bary.z;
}
void hittestIcon(
inout lowp vec4 out_color,
out highp vec3 out_pos,
in vec3 pos,
in vec3 offset,
in vec2 size,
in float scaleFactor,
in float isMapAligned
) {
out_pos = vec3(getAttributeDataTextureCoords(a_id), 0.0);
vec3 posBase = u_viewMat3 * u_tileMat3  * pos;
vec3 offset1 = scaleFactor * vec3(a_vertexOffset1 / 16.0, 0.);
vec3 offset2 = scaleFactor * vec3(a_vertexOffset2 / 16.0, 0.);
vec2 pos0    = (posBase + getMatrixNoDisplay(isMapAligned) * offset).xy;
vec2 pos1    = (posBase + getMatrixNoDisplay(isMapAligned) * offset1).xy;
vec2 pos2    = (posBase + getMatrixNoDisplay(isMapAligned) * offset2).xy;
vec3 bary0 = xyToBarycentric(u_hittestPos + vec2(-u_hittestDist, -u_hittestDist), pos0, pos1, pos2);
vec3 bary1 = xyToBarycentric(u_hittestPos + vec2(0., -u_hittestDist), pos0, pos1, pos2);
vec3 bary2 = xyToBarycentric(u_hittestPos + vec2(u_hittestDist, -u_hittestDist), pos0, pos1, pos2);
vec3 bary3 = xyToBarycentric(u_hittestPos + vec2(-u_hittestDist, 0.), pos0, pos1, pos2);
vec3 bary4 = xyToBarycentric(u_hittestPos, pos0, pos1, pos2);
vec3 bary5 = xyToBarycentric(u_hittestPos + vec2(u_hittestDist, 0.), pos0, pos1, pos2);
vec3 bary6 = xyToBarycentric(u_hittestPos + vec2(-u_hittestDist, u_hittestDist), pos0, pos1, pos2);
vec3 bary7 = xyToBarycentric(u_hittestPos + vec2(0., u_hittestDist), pos0, pos1, pos2);
vec3 bary8 = xyToBarycentric(u_hittestPos + vec2(u_hittestDist, u_hittestDist), pos0, pos1, pos2);
vec2 tex0 = a_texCoords  / u_mosaicSize;
vec2 tex1 = a_texCoords1 / u_mosaicSize;
vec2 tex2 = a_texCoords2 / u_mosaicSize;
float alphaSum = 0.;
alphaSum += inTriangle(bary0) * getColor(size, getTextureCoords(bary0, tex0, tex1, tex2)).a;
alphaSum += inTriangle(bary1) * getColor(size, getTextureCoords(bary1, tex0, tex1, tex2)).a;
alphaSum += inTriangle(bary2) * getColor(size, getTextureCoords(bary2, tex0, tex1, tex2)).a;
alphaSum += inTriangle(bary3) * getColor(size, getTextureCoords(bary3, tex0, tex1, tex2)).a;
alphaSum += inTriangle(bary4) * getColor(size, getTextureCoords(bary4, tex0, tex1, tex2)).a;
alphaSum += inTriangle(bary5) * getColor(size, getTextureCoords(bary5, tex0, tex1, tex2)).a;
alphaSum += inTriangle(bary6) * getColor(size, getTextureCoords(bary6, tex0, tex1, tex2)).a;
alphaSum += inTriangle(bary7) * getColor(size, getTextureCoords(bary7, tex0, tex1, tex2)).a;
out_pos.z += step(alphaSum, .05) * 2.0;
out_color = vec4(1. / 255., 0., 0., alphaSum / 255.);
}
#endif`,"icon.frag":`precision mediump float;
#include <materials/constants.glsl>
#include <materials/utils.glsl>
#include <materials/icon/common.glsl>
void main()
{
#ifdef HITTEST
vec4 color = v_color;
#else
vec4 color = getColor(v_sizeTex.xy, v_sizeTex.zw);
#endif
#ifdef HIGHLIGHT
color.a = step(1.0 / 255.0, color.a);
#endif
gl_FragColor = color;
}`,"icon.vert":`precision highp float;
attribute vec4 a_color;
attribute vec4 a_outlineColor;
attribute vec4 a_sizeAndOutlineWidth;
attribute vec2 a_vertexOffset;
attribute vec2 a_texCoords;
attribute vec2 a_bitSetAndDistRatio;
attribute vec2 a_zoomRange;
#include <materials/vcommon.glsl>
#include <materials/icon/common.glsl>
#include <materials/icon/hittest.glsl>
float getMarkerScaleFactor(inout vec2 size, in float referenceSize) {
#ifdef VV_SIZE
float f = getSize(size.y) / size.y;
float sizeFactor = size.y / referenceSize;
return getSize(referenceSize) / referenceSize;
#else
return 1.;
#endif
}
void main()
{
INIT;
float a_bitSet = a_bitSetAndDistRatio.x;
vec3  pos           = vec3(a_pos * POSITION_PRECISION, 1.0);
vec2  size          = a_sizeAndOutlineWidth.xy * a_sizeAndOutlineWidth.xy / 128.0;
vec3  offset        = vec3(a_vertexOffset / 16.0, 0.);
float outlineSize   = a_sizeAndOutlineWidth.z * a_sizeAndOutlineWidth.z / 128.0;
float isMapAligned  = getBit(a_bitSet, BITSET_MARKER_ALIGNMENT_MAP);
float referenceSize = a_sizeAndOutlineWidth.w * a_sizeAndOutlineWidth.w / 128.0;
float scaleSymbolProportionally = getBit(a_bitSet, BITSET_MARKER_SCALE_SYMBOLS_PROPORTIONALLY);
float scaleFactor               = getMarkerScaleFactor(size, referenceSize);
size.xy     *= scaleFactor;
offset.xy   *= scaleFactor;
outlineSize *= scaleSymbolProportionally * (scaleFactor - 1.0) + 1.0;
vec2 v_tex   = a_texCoords / u_mosaicSize;
float filterFlags = getFilterFlags();
v_color    = getColor(a_color, a_bitSet, BITSET_GENERIC_LOCK_COLOR);
v_opacity  = getOpacity();
v_id       = norm(a_id);
v_pos      = u_dvsMat3 * pos + getMatrix(isMapAligned) * getRotation()  * offset;
v_sizeTex  = vec4(size.xy, v_tex.xy);
#ifdef SDF
v_isThin   = getBit(a_bitSet, BITSET_MARKER_OUTLINE_ALLOW_COLOR_OVERRIDE);
#ifdef VV_COLOR
v_overridingOutlineColor = v_isThin;
#else
v_overridingOutlineColor = 0.0;
#endif
v_outlineWidth = min(outlineSize, max(max(size.x, size.y) - 0.99, 0.0));
v_outlineColor = a_outlineColor;
v_distRatio = a_bitSetAndDistRatio.y / 128.0;
#endif
#ifdef HITTEST
highp vec4 out_color = vec4(0.);
highp vec3 out_pos   = vec3(0.);
hittestIcon(out_color, out_pos, pos, offset, size, scaleFactor, isMapAligned);
v_color = out_color;
gl_PointSize = 1.;
gl_Position = vec4(clip(v_color, out_pos, filterFlags, a_zoomRange), 1.0);
#else
gl_Position = vec4(clip(v_color, v_pos, filterFlags, a_zoomRange), 1.0);
#endif
}`},label:{"common.glsl":`uniform mediump float u_zoomLevel;
uniform mediump float u_mapRotation;
uniform mediump float u_mapAligned;
uniform mediump vec2 u_mosaicSize;
varying mediump float v_antialiasingWidth;
varying mediump float v_edgeDistanceOffset;
varying mediump vec2 v_tex;
varying mediump vec4 v_color;
varying lowp vec4 v_animation;`,"label.frag":"#include <materials/text/text.frag>","label.vert":`precision highp float;
#include <materials/vcommon.glsl>
#include <materials/text/common.glsl>
attribute vec4 a_color;
attribute vec4 a_haloColor;
attribute vec4 a_texAndSize;
attribute vec4 a_refSymbolAndPlacementOffset;
attribute vec4 a_glyphData;
attribute vec2 a_vertexOffset;
attribute vec2 a_texCoords;
uniform float u_isHaloPass;
uniform float u_isBackgroundPass;
uniform float u_mapRotation;
uniform float u_mapAligned;
float getZ(in float minZoom, in float maxZoom, in float angle) {
float glyphAngle = angle * 360.0 / 254.0;
float mapAngle = u_mapRotation * 360.0 / 254.0;
float diffAngle = min(360.0 - abs(mapAngle - glyphAngle), abs(mapAngle - glyphAngle));
float z = 0.0;
z += u_mapAligned * (2.0 * (1.0 - step(minZoom, u_currentZoom)));
z += u_mapAligned * 2.0 * step(90.0, diffAngle);
z += 2.0 * (1.0 - step(u_currentZoom, maxZoom));
return z;
}
void main()
{
INIT;
float groupMinZoom    = getMinZoom();
float glyphMinZoom    = a_glyphData.x;
float glyphMaxZoom    = a_glyphData.y;
float glyphAngle      = a_glyphData.z;
float a_isBackground  = a_glyphData.w;
float a_minZoom          = max(groupMinZoom, glyphMinZoom);
float a_placementPadding = a_refSymbolAndPlacementOffset.x * EXTRUDE_SCALE_PLACEMENT_PADDING;
vec2  a_placementDir     = unpack_u8_nf32(a_refSymbolAndPlacementOffset.zw);
float a_refSymbolSize    = a_refSymbolAndPlacementOffset.y;
float fontSize           = a_texAndSize.z;
float haloSize           = a_texAndSize.w * OUTLINE_SCALE;
vec2  vertexOffset = a_vertexOffset * OFFSET_PRECISION;
vec3  pos          = vec3(a_pos * POSITION_PRECISION, 1.0);
float z            = getZ(a_minZoom, glyphMaxZoom, glyphAngle);
float fontScale    = fontSize / SDF_FONT_SIZE;
float halfSize     = getSize(a_refSymbolSize) / 2.0;
float animation    = pow(getAnimationState(), vec4(2.0)).r;
float isText = 1.0 - a_isBackground;
float isBackground = u_isBackgroundPass * a_isBackground;
vec4  nonHaloColor = (isBackground + isText) * a_color;
v_color     = animation * ((1.0 - u_isHaloPass) * nonHaloColor + (u_isHaloPass * a_haloColor));
v_opacity   = 1.0;
v_tex       = a_texCoords / u_mosaicSize;
v_edgeDistanceOffset = u_isHaloPass * haloSize / fontScale / MAX_SDF_DISTANCE;
v_antialiasingWidth  = 0.105 * SDF_FONT_SIZE / fontSize / u_pixelRatio;
vec2 placementOffset = a_placementDir * (halfSize + a_placementPadding);
vec3 glyphOffset     = u_displayMat3 * vec3(vertexOffset + placementOffset, 0.0);
vec3 v_pos           = vec3((u_dvsMat3 * pos + glyphOffset).xy, z);
float isHidden = u_isBackgroundPass * isText + (1.0 - u_isBackgroundPass) * a_isBackground;
v_pos.z += 2.0 * isHidden;
gl_Position = vec4(v_pos, 1.0);
#ifdef DEBUG
v_color = vec4(a_color.rgb, z == 0.0 ? 1.0 : 0.645);
#endif
}`},line:{"common.glsl":`varying lowp vec4 v_color;
varying highp vec3 v_id;
varying mediump vec2 v_normal;
varying mediump float v_lineHalfWidth;
varying lowp float v_opacity;
#ifdef PATTERN
varying mediump vec4 v_tlbr;
varying mediump vec2 v_patternSize;
#endif
#if defined(PATTERN) || defined(SDF)
varying highp float v_accumulatedDistance;
#endif
#ifdef SDF
varying mediump float v_lineWidthRatio;
#endif`,"hittest.glsl":`#include <materials/hittest/common.glsl>
#ifdef HITTEST
attribute vec2 a_pos1;
attribute vec2 a_pos2;
void hittestLine(out lowp vec4 out_color, out highp vec3 out_pos, float halfWidth) {
vec3 pos        = u_viewMat3 * u_tileMat3 * vec3(a_pos  * POSITION_PRECISION, 1.);
vec3 pos1       = u_viewMat3 * u_tileMat3 * vec3(a_pos1 * POSITION_PRECISION, 1.);
vec3 pos2       = u_viewMat3 * u_tileMat3 * vec3(a_pos2 * POSITION_PRECISION, 1.);
vec3 outTextureCoords = vec3(getAttributeDataTextureCoords(a_id), 0.0);
float dist = min(distPointSegment(u_hittestPos, pos.xy, pos1.xy),
distPointSegment(u_hittestPos, pos.xy, pos2.xy)) - halfWidth;
out_pos = vec3(getAttributeDataTextureCoords(a_id), 0.0);
if (dist >= u_hittestDist) {
out_pos.z += 2.0;
}
out_color = vec4(1. / 255., 0, 0, dist <= 0. ? (1. / 255.) : 0.);
}
#endif`,"line.frag":`precision lowp float;
#include <util/encoding.glsl>
#include <materials/constants.glsl>
#include <materials/symbologyTypeUtils.glsl>
#include <materials/line/common.glsl>
#include <materials/shared/line/common.glsl>
#include <materials/shared/line/line.frag>
#ifdef HITTEST
void main() {
gl_FragColor = v_color;
}
#else
void main() {
LineData inputs = LineData(
v_color,
v_normal,
v_lineHalfWidth,
v_opacity,
#ifndef SYMBOLOGY_TYPE_IS_OUTLINE_FILL_LIKE
#ifdef PATTERN
v_tlbr,
v_patternSize,
#endif
#ifdef SDF
v_lineWidthRatio,
#endif
#if defined(PATTERN) || defined(SDF)
v_accumulatedDistance,
#endif
#endif
v_id
);
gl_FragColor = shadeLine(inputs);
}
#endif`,"line.vert":`precision highp float;
attribute vec4 a_color;
attribute vec4 a_offsetAndNormal;
attribute vec2 a_accumulatedDistanceAndHalfWidth;
attribute vec4 a_tlbr;
attribute vec4 a_segmentDirection;
attribute vec2 a_aux;
attribute vec2 a_zoomRange;
#include <materials/vcommon.glsl>
#include <materials/symbologyTypeUtils.glsl>
#include <materials/line/common.glsl>
#include <materials/line/hittest.glsl>
#include <materials/shared/line/common.glsl>
#include <materials/shared/line/line.vert>
#ifdef HITTEST
void draw() {
float aa        = 0.5 * u_antialiasing;
float a_halfWidth = a_accumulatedDistanceAndHalfWidth.y / 16.;
float a_cimHalfWidth = a_aux.x / 16. ;
vec2  a_offset = a_offsetAndNormal.xy / 16.;
float baseWidth = getBaseLineHalfWidth(a_halfWidth, a_cimHalfWidth);
float halfWidth = getLineHalfWidth(baseWidth, aa);
highp vec3 pos  = vec3(0.);
v_color = vec4(0.);
hittestLine(v_color, pos, halfWidth);
gl_PointSize = 1.;
gl_Position = vec4(clip(v_color, pos, getFilterFlags(), a_zoomRange), 1.0);
}
#else
void draw()
{
highp vec3 pos = vec3(0.);
LineData outputs = buildLine(
pos,
a_id,
a_pos,
a_color,
a_offsetAndNormal.xy / 16.,
a_offsetAndNormal.zw / 16.,
a_accumulatedDistanceAndHalfWidth.x,
a_accumulatedDistanceAndHalfWidth.y / 16.,
a_segmentDirection.w,
a_tlbr,
a_segmentDirection.xy / 16.,
a_aux.x / 16.
);
v_id              = outputs.id;
v_color           = outputs.color;
v_normal          = outputs.normal;
v_lineHalfWidth   = outputs.lineHalfWidth;
v_opacity         = outputs.opacity;
#ifndef SYMBOLOGY_TYPE_IS_OUTLINE_FILL_LIKE
#ifdef PATTERN
v_tlbr          = outputs.tlbr;
v_patternSize   = outputs.patternSize;
#endif
#ifdef SDF
v_lineWidthRatio = outputs.lineWidthRatio;
#endif
#if defined(PATTERN) || defined(SDF)
v_accumulatedDistance = outputs.accumulatedDistance;
#endif
#endif
gl_Position = vec4(clip(outputs.color, pos, getFilterFlags(), a_zoomRange), 1.0);
}
#endif
void main() {
INIT;
draw();
}`},pie:{"pie.common.glsl":`uniform float outlineWidth;
uniform mediump float sectorThreshold;
varying vec3  v_id;
varying vec3  v_pos;
varying vec2  v_offset;
varying vec4  v_color;
varying float v_size;
varying float v_numOfEntries;
varying float v_maxSectorAngle;
varying vec2  v_filteredSectorToColorId[numberOfFields];
varying vec2  v_texCoords;
varying float v_outlineWidth;
varying float v_opacity;
struct FilteredChartInfo {
float endSectorAngle;
int colorId;
};`,"pie.frag":`precision highp float;
#include <util/atan2.glsl>
#include <materials/constants.glsl>
#include <materials/utils.glsl>
#include <materials/pie/pie.common.glsl>
uniform lowp vec4 colors[numberOfFields];
uniform lowp vec4 defaultColor;
uniform lowp vec4 othersColor;
uniform lowp vec4 outlineColor;
uniform float donutRatio;
lowp vec4 getSectorColor(in int index, in vec2 filteredSectorToColorId[numberOfFields]) {
mediump int colorIndex = int(filteredSectorToColorId[index].y);
return colors[colorIndex];
}
const int OTHER_SECTOR_ID = 255;
#ifdef HITTEST
vec4 getColor() {
float distanceSize = length(v_offset) * v_size;
float donutSize = donutRatio * v_size;
float alpha = step(donutSize, distanceSize) * (1.0 - step(v_size, distanceSize));
return v_color;
}
#else
vec4 getColor() {
float angle = mod(90.0 - C_RAD_TO_DEG * atan2(v_offset.y, v_offset.x), 360.0);
int numOfEntries = int(v_numOfEntries);
float maxSectorAngle = v_maxSectorAngle;
lowp vec4 fillColor = (maxSectorAngle > 0.0 || sectorThreshold > 0.0) ? othersColor : defaultColor;
lowp vec4 prevColor = vec4(0.0);
lowp vec4 nextColor = vec4(0.0);
float startSectorAngle = 0.0;
float endSectorAngle = 0.0;
if (angle < maxSectorAngle) {
for (int index = 0; index < numberOfFields; ++index) {
startSectorAngle = endSectorAngle;
endSectorAngle = v_filteredSectorToColorId[index].x;
if (endSectorAngle > angle) {
fillColor = getSectorColor(index, v_filteredSectorToColorId);
prevColor = sectorThreshold != 0.0 && index == 0 && maxSectorAngle + EPSILON < 360. ? othersColor :
getSectorColor(index > 0 ? index - 1 : numOfEntries - 1, v_filteredSectorToColorId);
nextColor = sectorThreshold != 0.0 && abs(endSectorAngle - maxSectorAngle) < EPSILON && maxSectorAngle + EPSILON < 360. ? othersColor :
getSectorColor(index < numOfEntries - 1 ? index + 1 : 0, v_filteredSectorToColorId);
break;
}
if (index == numOfEntries - 1) {
break;
}
}
} else if (numOfEntries <= 0) {
prevColor = nextColor = fillColor;
} else {
prevColor = getSectorColor(numOfEntries - 1, v_filteredSectorToColorId);
nextColor = getSectorColor(0, v_filteredSectorToColorId);
startSectorAngle = maxSectorAngle;
endSectorAngle = 360.0;
}
lowp vec4 outlineColor = outlineColor;
float offset = length(v_offset);
float distanceSize = offset * v_size;
float distanceToStartSector = (angle - startSectorAngle);
float distanceToEndSector = (endSectorAngle - angle);
float sectorThreshold = 0.75;
float beginSectorAlpha = smoothstep(-sectorThreshold, sectorThreshold, distanceToStartSector * offset);
float endSectorAlpha = smoothstep(-sectorThreshold, sectorThreshold, distanceToEndSector * offset);
fillColor = mix(prevColor, fillColor, beginSectorAlpha) + mix(nextColor, fillColor, endSectorAlpha) - fillColor;
float aaThreshold = 0.75;
float startOfOutline = v_size - v_outlineWidth - aaThreshold;
float donutSize = donutRatio * startOfOutline;
float endOfDonut = donutSize - v_outlineWidth;
float innerCircleAlpha = endOfDonut > aaThreshold ? smoothstep(endOfDonut - aaThreshold, endOfDonut + aaThreshold, distanceSize) : 1.0;
float outerCircleAlpha = 1.0 - smoothstep(v_size - 2.0 * aaThreshold, v_size, distanceSize);
float circleAlpha = innerCircleAlpha * outerCircleAlpha;
if (startOfOutline > 0.0 && v_outlineWidth > 0.25) {
float outlineFactor = smoothstep(startOfOutline - aaThreshold, startOfOutline + aaThreshold, distanceSize);
float innerLineFactor = donutSize - aaThreshold > 0.0 ? 1.0 - smoothstep(donutSize - aaThreshold, donutSize + aaThreshold , distanceSize) : 0.0;
fillColor = mix(fillColor, outlineColor, innerLineFactor + outlineFactor);
}
return v_opacity * circleAlpha * fillColor;
}
#endif
void main()
{
vec4 color = getColor();
#ifdef highlight
color.a = step(1.0 / 255.0, color.a);
#endif
gl_FragColor = color;
}`,"pie.vert":`#include <materials/constants.glsl>
#include <materials/utils.glsl>
#include <materials/barycentric.glsl>
#include <materials/vcommon.glsl>
#include <materials/vv.glsl>
#include <materials/attributeData.glsl>
#include <materials/pie/pie.common.glsl>
#include <materials/hittest/common.glsl>
attribute float a_bitSet;
attribute vec2  a_offset;
attribute vec2  a_texCoords;
attribute float a_referenceSize;
attribute vec2  a_zoomRange;
int filterValue(in float sectorAngle,
in int currentIndex,
inout FilteredChartInfo filteredInfo,
inout vec2 filteredSectorToColorId[numberOfFields]) {
if (sectorAngle > sectorThreshold * 360.0) {
filteredInfo.endSectorAngle += sectorAngle;
filteredSectorToColorId[filteredInfo.colorId] = vec2(filteredInfo.endSectorAngle, currentIndex);
++filteredInfo.colorId;
}
return 0;
}
int filterValues(inout vec2 filteredSectorToColorId[numberOfFields],
inout FilteredChartInfo filteredInfo,
in float sectorAngles[numberOfFields]) {
for (int index = 0; index < numberOfFields; ++index) {
float sectorValue = sectorAngles[index];
filterValue(sectorValue, index, filteredInfo, filteredSectorToColorId);
}
return filteredInfo.colorId;
}
float getMarkerSize(inout vec2 offset, inout float outlineSize, in float referenceSize, in float bitSet) {
float outSize = referenceSize * 0.5;
#ifdef VV_SIZE
float r = getSize(referenceSize, currentScale) / referenceSize;
outSize *= r;
offset.xy *= r;
float scaleSymbolProportionally = getBit(bitSet, BITSET_MARKER_SCALE_SYMBOLS_PROPORTIONALLY);
outlineSize *= scaleSymbolProportionally * (r - 1.0) + 1.0;
#endif
return outSize;
}
vec3 getOffset(in vec2 in_offset, float a_bitSet) {
float isMapAligned = getBit(a_bitSet, BITSET_MARKER_ALIGNMENT_MAP);
vec3  offset       = vec3(in_offset, 0.0);
return getMatrix(isMapAligned) * offset;
}
float filterNaNValues(in float value) {
return value != NAN_MAGIC_NUMBER && value > 0.0 ? value : 0.0;
}
void main()
{
INIT;
vec2  a_offset = a_offset / 16.0;
float outlineSize = outlineWidth;
float a_bitSet = a_bitSet;
float a_referenceSize = a_referenceSize;
vec2 a_texCoords = a_texCoords / 4.0;
float markerSize = getMarkerSize(a_offset, outlineSize, a_referenceSize, a_bitSet);
float filterFlags = getFilterFlags();
vec3  pos         = vec3(a_pos / 10.0, 1.0);
v_opacity      = getOpacity();
v_pos          = displayViewScreenMat3 * pos + getOffset(a_offset, a_bitSet);
v_offset       = sign(a_texCoords - 0.5);
v_size         = markerSize;
v_outlineWidth = outlineSize;
float attributeData[10];
vec4 attributeData3 = getDataDriven0(a_id);
attributeData[0] = filterNaNValues(attributeData3.x);
attributeData[1] = filterNaNValues(attributeData3.y);
attributeData[2] = filterNaNValues(attributeData3.z);
attributeData[3] = filterNaNValues(attributeData3.w);
#if (numberOfFields > 4)
vec4 attributeData4 = getDataDriven1(a_id);
attributeData[4] = filterNaNValues(attributeData4.x);
attributeData[5] = filterNaNValues(attributeData4.y);
attributeData[6] = filterNaNValues(attributeData4.z);
attributeData[7] = filterNaNValues(attributeData4.w);
#endif
#if (numberOfFields > 8)
vec4 attributeData5 = getDataDriven2(a_id);
attributeData[8] = filterNaNValues(attributeData5.x);
attributeData[9] = filterNaNValues(attributeData5.y);
#endif
float sum = 0.0;
for (int i = 0; i < numberOfFields; ++i) {
sum += attributeData[i];
}
float sectorAngles[numberOfFields];
for (int i = 0; i < numberOfFields; ++i) {
sectorAngles[i] = 360.0 * attributeData[i] / sum;
}
vec2 filteredSectorToColorId[numberOfFields];
FilteredChartInfo filteredInfo = FilteredChartInfo(0.0, 0);
int numOfEntries = filterValues(filteredSectorToColorId, filteredInfo, sectorAngles);
v_numOfEntries = float(numOfEntries);
v_maxSectorAngle = filteredInfo.endSectorAngle;
v_filteredSectorToColorId = filteredSectorToColorId;
#ifdef HITTEST
highp vec3 out_pos = vec3(0.0);
v_color            = vec4(0.0);
hittestMarker(v_color, out_pos, viewMat3 * tileMat3 *  pos, v_size);
gl_PointSize = 1.0;
gl_Position = vec4(clip(v_color, out_pos, filterFlags, a_zoomRange), 1.0);
#else
gl_Position = vec4(clip(v_color, v_pos, filterFlags, a_zoomRange), 1.0);
#endif
}`},shared:{line:{"common.glsl":`#if !defined(SYMBOLOGY_TYPE_IS_OUTLINE_FILL_LIKE) && defined(PATTERN)
uniform mediump vec2 u_mosaicSize;
varying mediump float v_sampleAlphaOnly;
#endif
struct LineData {
lowp vec4 color;
mediump vec2 normal;
mediump float lineHalfWidth;
lowp float opacity;
#ifndef SYMBOLOGY_TYPE_IS_OUTLINE_FILL_LIKE
#ifdef PATTERN
mediump vec4 tlbr;
mediump vec2 patternSize;
#endif
#ifdef SDF
mediump float lineWidthRatio;
#endif
#if defined(PATTERN) || defined(SDF)
highp float accumulatedDistance;
#endif
#endif
highp vec3 id;
};`,"line.frag":`uniform lowp float u_blur;
#if !defined(SYMBOLOGY_TYPE_IS_OUTLINE_FILL_LIKE) && !defined(HIGHLIGHT)
#if defined(PATTERN) || defined(SDF)
uniform sampler2D u_texture;
uniform highp float u_pixelRatio;
#endif
#endif
#if defined(SDF) && !defined(HIGHLIGHT) && !defined(SYMBOLOGY_TYPE_IS_OUTLINE_FILL_LIKE)
lowp vec4 getLineColor(LineData line) {
mediump float adjustedPatternWidth = line.patternSize.x * 2.0 * line.lineWidthRatio;
mediump float relativeTexX = fract(line.accumulatedDistance / adjustedPatternWidth);
mediump float relativeTexY = 0.5 + 0.25 * line.normal.y;
mediump vec2 texCoord = mix(line.tlbr.xy, line.tlbr.zw, vec2(relativeTexX, relativeTexY));
mediump float d = rgba2float(texture2D(u_texture, texCoord)) - 0.5;
float dist = d * line.lineHalfWidth;
return line.opacity * clamp(0.5 - dist, 0.0, 1.0) * line.color;
}
#elif defined(PATTERN) && !defined(HIGHLIGHT) && !defined(SYMBOLOGY_TYPE_IS_OUTLINE_FILL_LIKE)
lowp vec4 getLineColor(LineData line) {
mediump float lineHalfWidth = line.lineHalfWidth;
mediump float adjustedPatternHeight = line.patternSize.y * 2.0 * lineHalfWidth / line.patternSize.x;
mediump float relativeTexY = fract(line.accumulatedDistance / adjustedPatternHeight);
mediump float relativeTexX = 0.5 + 0.5 * line.normal.y;
mediump vec2 texCoord = mix(line.tlbr.xy, line.tlbr.zw, vec2(relativeTexX, relativeTexY));
lowp vec4 color = texture2D(u_texture, texCoord);
#ifdef VV_COLOR
if (v_sampleAlphaOnly > 0.5) {
color.rgb = vec3(color.a);
}
#endif
return line.opacity * line.color * color;
}
#else
lowp vec4 getLineColor(LineData line) {
return line.opacity * line.color;
}
#endif
vec4 shadeLine(LineData line)
{
mediump float thinLineFactor = max(THIN_LINE_WIDTH_FACTOR * step(line.lineHalfWidth, THIN_LINE_HALF_WIDTH), 1.0);
mediump float fragDist = length(line.normal) * line.lineHalfWidth;
lowp float alpha = clamp(thinLineFactor * (line.lineHalfWidth - fragDist) / (u_blur + thinLineFactor - 1.0), 0.0, 1.0);
lowp vec4 out_color = getLineColor(line) * alpha;
#ifdef HIGHLIGHT
out_color.a = step(1.0 / 255.0, out_color.a);
#endif
#ifdef ID
if (out_color.a < 1.0 / 255.0) {
discard;
}
out_color = vec4(line.id, 0.0);
#endif
return out_color;
}`,"line.vert":`float getBaseLineHalfWidth(in float lineHalfWidth, in float referenceHalfWidth) {
#ifdef VV_SIZE
float refLineWidth = 2.0 * referenceHalfWidth;
return 0.5 * (lineHalfWidth / max(referenceHalfWidth, EPSILON)) * getSize(refLineWidth);
#else
return lineHalfWidth;
#endif
}
float getLineHalfWidth(in float baseWidth, in float aa) {
float halfWidth = max(baseWidth + aa, 0.45) + 0.1 * aa;
#ifdef HIGHLIGHT
halfWidth = max(halfWidth, 2.0);
#endif
return halfWidth;
}
vec2 getDist(in vec2 offset, in float halfWidth) {
float thinLineFactor = max(THIN_LINE_WIDTH_FACTOR * step(halfWidth, THIN_LINE_HALF_WIDTH), 1.0);
return thinLineFactor * halfWidth * offset;
}
LineData buildLine(
out vec3 out_pos,
in vec3 in_id,
in vec2 in_pos,
in vec4 in_color,
in vec2 in_offset,
in vec2 in_normal,
in float in_accumulatedDist,
in float in_lineHalfWidth,
in float in_bitSet,
in vec4 in_tlbr,
in vec2 in_segmentDirection,
in float in_referenceHalfWidth
)
{
float aa        = 0.5 * u_antialiasing;
float baseWidth = getBaseLineHalfWidth(in_lineHalfWidth, in_referenceHalfWidth);
float halfWidth = getLineHalfWidth(baseWidth, aa);
float z         = 2.0 * step(baseWidth, 0.0);
vec2  dist      = getDist(in_offset, halfWidth);
vec3  offset    = u_displayViewMat3 * vec3(dist, 0.0);
vec3  pos       = u_dvsMat3 * vec3(in_pos * POSITION_PRECISION, 1.0) + offset;
#ifdef SYMBOLOGY_TYPE_IS_OUTLINE_FILL_LIKE
vec4  color     = in_color;
float opacity   = 1.0;
#else
vec4  color     = getColor(in_color, in_bitSet, BITSET_GENERIC_LOCK_COLOR);
float opacity   = getOpacity();
#ifdef SDF
const float SDF_PATTERN_HALF_WIDTH = 15.5;
float scaleDash = getBit(in_bitSet, BITSET_LINE_SCALE_DASH);
float lineWidthRatio = (scaleDash * max(halfWidth - 0.55 * u_antialiasing, 0.25) + (1.0 - scaleDash)) / SDF_PATTERN_HALF_WIDTH;
#endif
#endif
#if !defined(SYMBOLOGY_TYPE_IS_OUTLINE_FILL_LIKE) && defined(PATTERN)
v_sampleAlphaOnly = getBit(in_bitSet, BITSET_GENERIC_CONSIDER_ALPHA_ONLY);
#endif
out_pos = vec3(pos.xy, z);
return LineData(
color,
in_normal,
halfWidth,
opacity,
#ifndef SYMBOLOGY_TYPE_IS_OUTLINE_FILL_LIKE
#ifdef PATTERN
in_tlbr / u_mosaicSize.xyxy,
vec2(in_tlbr.z - in_tlbr.x, in_tlbr.w - in_tlbr.y),
#endif
#ifdef SDF
lineWidthRatio,
#endif
#if defined(PATTERN) || defined(SDF)
in_accumulatedDist * u_zoomFactor + dot(in_segmentDirection, dist),
#endif
#endif
norm(in_id)
);
}`}},"symbologyTypeUtils.glsl":`#if SYMBOLOGY_TYPE == SYMBOLOGY_TYPE_OUTLINE_FILL || SYMBOLOGY_TYPE == SYMBOLOGY_TYPE_OUTLINE_FILL_SIMPLE
#define SYMBOLOGY_TYPE_IS_OUTLINE_FILL_LIKE
#endif
#if SYMBOLOGY_TYPE == SYMBOLOGY_TYPE_SIMPLE || SYMBOLOGY_TYPE == SYMBOLOGY_TYPE_OUTLINE_FILL_SIMPLE
#define SYMBOLOGY_TYPE_IS_SIMPLE_LIKE
#endif`,text:{"common.glsl":`uniform highp vec2 u_mosaicSize;
varying highp vec3 v_id;
varying mediump vec3 v_pos;
varying lowp float v_opacity;
varying lowp vec4 v_color;
varying highp vec2 v_tex;
varying mediump float v_antialiasingWidth;
varying mediump float v_edgeDistanceOffset;
varying lowp float v_transparency;`,"hittest.glsl":"#include <materials/hittest/common.glsl>","text.frag":`precision mediump float;
#include <materials/text/common.glsl>
uniform lowp sampler2D u_texture;
#ifdef HITTEST
vec4 getColor() {
return v_color;
}
#else
vec4 getColor()
{
float SDF_CUTOFF = (2.0 / 8.0);
float SDF_BASE_EDGE_DIST = 1.0 - SDF_CUTOFF;
lowp float dist = texture2D(u_texture, v_tex).a;
mediump float edge = SDF_BASE_EDGE_DIST - v_edgeDistanceOffset;
#ifdef HIGHLIGHT
edge /= 2.0;
#endif
lowp float aa = v_antialiasingWidth;
lowp float alpha = smoothstep(edge - aa, edge + aa, dist);
return alpha * v_color * v_opacity;
}
#endif
void main()
{
gl_FragColor = getColor();
}`,"text.vert":`precision highp float;
#include <materials/utils.glsl>
#include <materials/vcommon.glsl>
#include <materials/text/common.glsl>
#include <materials/text/hittest.glsl>
attribute vec4 a_color;
attribute vec4 a_haloColor;
attribute vec4 a_texFontSize;
attribute vec4 a_aux;
attribute vec2 a_zoomRange;
attribute vec2 a_vertexOffset;
attribute vec2 a_texCoords;
uniform float u_isHaloPass;
uniform float u_isBackgroundPass;
float getTextSize(inout vec2 offset, inout float baseSize, in float referenceSize) {
#ifdef VV_SIZE
float r = getSize(referenceSize) / referenceSize;
baseSize *= r;
offset.xy *= r;
return baseSize;
#endif
return baseSize;
}
void main()
{
INIT;
float a_isBackground  = a_aux.y;
float a_referenceSize = a_aux.z * a_aux.z / 256.0;
float a_bitSet        = a_aux.w;
float a_fontSize      = a_texFontSize.z;
vec2  a_offset        = a_vertexOffset * OFFSET_PRECISION;
vec3  in_pos        = vec3(a_pos * POSITION_PRECISION, 1.0);
float fontSize      = getTextSize(a_offset, a_fontSize, a_referenceSize);
float fontScale     = fontSize / SDF_FONT_SIZE;
vec3  offset        = getRotation() * vec3(a_offset, 0.0);
mat3  extrudeMatrix = getBit(a_bitSet, 0) == 1.0 ? u_displayViewMat3 : u_displayMat3;
float isText = 1.0 - a_isBackground;
float isBackground = u_isBackgroundPass * a_isBackground;
vec4  nonHaloColor  = (isBackground * a_color) + (isText * getColor(a_color, a_bitSet, 1));
v_color   = u_isHaloPass * a_haloColor + (1.0 - u_isHaloPass) * nonHaloColor;
v_opacity = getOpacity();
v_id      = norm(a_id);
v_tex     = a_texCoords / u_mosaicSize;
v_pos     = u_dvsMat3 * in_pos + extrudeMatrix * offset;
float isHidden = u_isBackgroundPass * isText + (1.0 - u_isBackgroundPass) * a_isBackground;
v_pos.z += 2.0 * isHidden;
v_edgeDistanceOffset = u_isHaloPass * OUTLINE_SCALE * a_texFontSize.w / fontScale / MAX_SDF_DISTANCE;
v_antialiasingWidth  = 0.105 * SDF_FONT_SIZE / fontSize / u_pixelRatio;
#ifdef HITTEST
highp vec3 out_pos  = vec3(0.);
v_color = vec4(0.);
hittestMarker(v_color, out_pos, u_viewMat3 * u_tileMat3 *  vec3(a_pos * POSITION_PRECISION, 1.0)
+ u_tileMat3 * offset, fontSize / 2.);
gl_PointSize = 1.;
gl_Position = vec4(clip(v_color, out_pos, getFilterFlags(), a_zoomRange), 1.0);
#else
gl_Position =  vec4(clip(v_color, v_pos, getFilterFlags(), a_zoomRange), 1.0);
#endif
}`},"utils.glsl":`float rshift(in float u32, in int amount) {
return floor(u32 / pow(2.0, float(amount)));
}
float getBit(in float bitset, in int bitIndex) {
float offset = pow(2.0, float(bitIndex));
return mod(floor(bitset / offset), 2.0);
}
const int maxHighlightReasons = 6;
float getFilterBit(in float bitset, in int bitIndex) {
return getBit(bitset, bitIndex + maxHighlightReasons);
}
float getHighlightBit(in float bitset, in int bitIndex) {
return getBit(bitset, bitIndex);
}
highp vec3 unpackDisplayIdTexel(in highp vec3 bitset) {
float isAggregate = getBit(bitset.b, 7);
return (1.0 - isAggregate) * bitset + isAggregate * (vec3(bitset.rgb) - vec3(0.0, 0.0, float(0x80)));
}
vec4 unpack(in float u32) {
float r = mod(rshift(u32, 0), 255.0);
float g = mod(rshift(u32, 8), 255.0);
float b = mod(rshift(u32, 16), 255.0);
float a = mod(rshift(u32, 24), 255.0);
return vec4(r, g, b, a);
}
vec3 norm(in vec3 v) {
return v /= 255.0;
}
vec4 norm(in vec4 v) {
return v /= 255.0;
}
float max4(vec4 target) {
return max(max(max(target.x, target.y), target.z), target.w);
}
vec2 unpack_u8_nf32(vec2 bytes) {
return (bytes - 127.0) / 127.0;
}
highp float rand(in vec2 co) {
highp float a = 12.9898;
highp float b = 78.233;
highp float c = 43758.5453;
highp float dt = dot(co, vec2(a,b));
highp float sn = mod(dt, 3.14);
return fract(sin(sn) * c);
}`,"vcommon.glsl":`#include <materials/constants.glsl>
#include <materials/utils.glsl>
#include <materials/attributeData.glsl>
#include <materials/vv.glsl>
#include <materials/barycentric.glsl>
attribute vec2 a_pos;
attribute highp vec3 a_id;
uniform highp mat3 displayViewScreenMat3;
uniform highp mat3 displayViewMat3;
uniform highp mat3 displayMat3;
uniform highp mat3 tileMat3;
uniform highp mat3 viewMat3;
uniform highp float pixelRatio;
uniform mediump float zoomFactor;
uniform mediump float antialiasing;
uniform mediump float currentScale;
uniform mediump float currentZoom;
uniform mediump float metersPerSRUnit;
uniform mediump float activeReasons;
uniform mediump float highlightAll;
vec4 VV_ADATA = vec4(0.0);
void loadVisualVariableData(inout vec4 target) {
target.rgba = getVisualVariableData(a_id);
}
#ifdef VV
#define INIT loadVisualVariableData(VV_ADATA)
#else
#define INIT
#endif
vec4 getColor(in vec4 a_color, in float a_bitSet, int index) {
#ifdef VV_COLOR
float isColorLocked   = getBit(a_bitSet, index);
return getVVColor(VV_ADATA[ATTR_VV_COLOR], a_color, isColorLocked);
#else
return a_color;
#endif
}
float getOpacity() {
#ifdef VV_OPACITY
return getVVOpacity(VV_ADATA[ATTR_VV_OPACITY]);
#else
return 1.0;
#endif
}
float getSize(in float in_size, in float currentScale) {
#ifdef VV_SIZE
return getVVSize(in_size, VV_ADATA[ATTR_VV_SIZE], currentScale);
#else
return in_size;
#endif
}
mat3 getRotation() {
#ifdef VV_ROTATION
return getVVRotationMat3(mod(VV_ADATA[ATTR_VV_ROTATION], 360.0));
#else
return mat3(1.0);
#endif
}
float getFilterFlags() {
#ifdef IGNORES_SAMPLER_PRECISION
return ceil(getFilterData(a_id).x * 255.0);
#else
return getFilterData(a_id).x * 255.0;
#endif
}
vec4 getAnimationState() {
return getAnimation(a_id);
}
float getMinZoom() {
vec4 data0 = getFilterData(a_id) * 255.0;
return data0.g;
}
mat3 getMatrixNoDisplay(float isMapAligned) {
return isMapAligned * viewMat3 * tileMat3 + (1.0 - isMapAligned) * tileMat3;
}
mat3 getMatrix(float isMapAligned) {
return isMapAligned * displayViewMat3 + (1.0 - isMapAligned) * displayMat3;
}
float checkHighlightBit(float filterFlags, int index) {
return getHighlightBit(filterFlags, index) * getBit(activeReasons, index);
}
float checkHighlight(float filterFlags) {
float result = checkHighlightBit(filterFlags, 0);
for (int i = 1; i < maxHighlightReasons; i++) {
result = result + checkHighlightBit(filterFlags, i);
}
return step(0.1, result + highlightAll);
}
vec3 clip(inout vec4 color, inout vec3 pos, in float filterFlags, in vec2 minMaxZoom) {
pos.z += 2.0 * (1.0 - getFilterBit(filterFlags, 0));
#ifdef inside
pos.z += 2.0 * (1.0 - getFilterBit(filterFlags, 1));
#elif defined(outside)
pos.z += 2.0 * getFilterBit(filterFlags, 1);
#elif defined(highlight)
pos.z += 2.0 * (1.0 - checkHighlight(filterFlags));
#endif
pos.z += 2.0 * (step(minMaxZoom.y, currentZoom) + (1.0 - step(minMaxZoom.x, currentZoom)));
return pos;
}`,"vv.glsl":`#if defined(VV_SIZE_MIN_MAX_VALUE) || defined(VV_SIZE_SCALE_STOPS) || defined(VV_SIZE_FIELD_STOPS) || defined(VV_SIZE_UNIT_VALUE)
#define VV_SIZE
#endif
#if defined(VV_COLOR) || defined(VV_SIZE) || defined(VV_OPACITY) || defined(VV_ROTATION)
#define VV
#endif
#ifdef VV_COLOR
uniform highp float colorValues[8];
uniform vec4 colors[8];
#endif
#ifdef VV_SIZE_MIN_MAX_VALUE
uniform highp vec4 minMaxValueAndSize;
#endif
#ifdef VV_SIZE_SCALE_STOPS
uniform highp float values[8];
uniform float sizes[8];
#endif
#ifdef VV_SIZE_FIELD_STOPS
uniform highp float values[8];
uniform float sizes[8];
#endif
#ifdef VV_SIZE_UNIT_VALUE
uniform highp float unitMeterRatio;
#endif
#ifdef VV_OPACITY
uniform highp float opacityValues[8];
uniform float opacities[8];
#endif
#ifdef VV_ROTATION
uniform lowp float rotationType;
#endif
bool isNan(float val) {
return (val == NAN_MAGIC_NUMBER);
}
#ifdef VV_SIZE_MIN_MAX_VALUE
float getVVMinMaxSize(float sizeValue, float fallback) {
if (isNan(sizeValue)) {
return fallback;
}
float interpolationRatio = (sizeValue  - minMaxValueAndSize.x) / (minMaxValueAndSize.y - minMaxValueAndSize.x);
interpolationRatio = clamp(interpolationRatio, 0.0, 1.0);
return minMaxValueAndSize.z + interpolationRatio * (minMaxValueAndSize.w - minMaxValueAndSize.z);
}
#endif
#ifdef VV_SIZE_SCALE_STOPS
float getVVScaleStopsSize(float currentScale) {
float outSize;
if (currentScale <= values[0]) {
outSize = sizes[0];
} else {
if (currentScale >= values[7]) {
outSize = sizes[7];
} else {
int index;
index = -1;
for (int i = 0; i < 8; i++) {
if (values[i] > currentScale) {
index = i;
break;
}
}
int prevIndex = index - 1;
float a = currentScale - values[prevIndex];
float b = values[index] - values[prevIndex];
outSize = mix(sizes[prevIndex], sizes[index], a / b);
}
}
return outSize;
}
#endif
#ifdef VV_SIZE_FIELD_STOPS
const int VV_SIZE_N = 8;
float getVVStopsSize(float sizeValue, float fallback) {
if (isNan(sizeValue)) {
return fallback;
}
if (sizeValue <= values[0]) {
return sizes[0];
}
if (sizeValue >= values[VV_SIZE_N - 1]) {
return sizes[VV_SIZE_N - 1];
}
for (int i = 1; i < VV_SIZE_N; ++i) {
if (values[i] >= sizeValue) {
float f = (sizeValue - values[i-1]) / (values[i] - values[i-1]);
return mix(sizes[i-1], sizes[i], f);
}
}
return sizes[VV_SIZE_N - 1];
}
#endif
#ifdef VV_SIZE_UNIT_VALUE
float getVVUnitValue(float sizeValue, float fallback) {
if (isNan(sizeValue)) {
return fallback;
}
return sizeValue * (metersPerSRUnit / unitMeterRatio);
}
#endif
#ifdef VV_OPACITY
const int VV_OPACITY_N = 8;
float getVVOpacity(float opacityValue) {
if (isNan(opacityValue)) {
return 1.0;
}
if (opacityValue <= opacityValues[0]) {
return opacities[0];
}
for (int i = 1; i < VV_OPACITY_N; ++i) {
if (opacityValues[i] >= opacityValue) {
float f = (opacityValue - opacityValues[i-1]) / (opacityValues[i] - opacityValues[i-1]);
return mix(opacities[i-1], opacities[i], f);
}
}
return opacities[VV_OPACITY_N - 1];
}
#endif
#ifdef VV_ROTATION
mat4 getVVRotation(float rotationValue) {
if (isNan(rotationValue)) {
return mat4(1, 0, 0, 0,
0, 1, 0, 0,
0, 0, 1, 0,
0, 0, 0, 1);
}
float rotation = rotationValue;
if (rotationType == 1.0) {
rotation = 90.0 - rotation;
}
float angle = C_DEG_TO_RAD * rotation;
float sinA = sin(angle);
float cosA = cos(angle);
return mat4(cosA, sinA, 0, 0,
-sinA,  cosA, 0, 0,
0,     0, 1, 0,
0,     0, 0, 1);
}
mat3 getVVRotationMat3(float rotationValue) {
if (isNan(rotationValue)) {
return mat3(1, 0, 0,
0, 1, 0,
0, 0, 1);
}
float rotation = rotationValue;
if (rotationType == 1.0) {
rotation = 90.0 - rotation;
}
float angle = C_DEG_TO_RAD * -rotation;
float sinA = sin(angle);
float cosA = cos(angle);
return mat3(cosA, -sinA, 0,
sinA, cosA, 0,
0,    0,    1);
}
#endif
#ifdef VV_COLOR
const int VV_COLOR_N = 8;
vec4 getVVColor(float colorValue, vec4 fallback, float isColorLocked) {
if (isNan(colorValue) || isColorLocked == 1.0) {
return fallback;
}
if (colorValue <= colorValues[0]) {
return colors[0];
}
for (int i = 1; i < VV_COLOR_N; ++i) {
if (colorValues[i] >= colorValue) {
float f = (colorValue - colorValues[i-1]) / (colorValues[i] - colorValues[i-1]);
return mix(colors[i-1], colors[i], f);
}
}
return colors[VV_COLOR_N - 1];
}
#endif
float getVVSize(in float size, in float vvSize, in float currentScale)  {
#ifdef VV_SIZE_MIN_MAX_VALUE
return getVVMinMaxSize(vvSize, size);
#elif defined(VV_SIZE_SCALE_STOPS)
float outSize = getVVScaleStopsSize(currentScale);
return isNan(outSize) ? size : outSize;
#elif defined(VV_SIZE_FIELD_STOPS)
float outSize = getVVStopsSize(vvSize, size);
return isNan(outSize) ? size : outSize;
#elif defined(VV_SIZE_UNIT_VALUE)
return getVVUnitValue(vvSize, size);
#else
return size;
#endif
}`},"post-processing":{dra:{"dra.frag":`precision mediump float;
uniform sampler2D u_minColor;
uniform sampler2D u_maxColor;
uniform sampler2D u_texture;
varying vec2 v_uv;
void main() {
vec4 minColor = texture2D(u_minColor, vec2(0.5));
vec4 maxColor = texture2D(u_maxColor, vec2(0.5));
vec4 color = texture2D(u_texture, v_uv);
vec3 minColorUnpremultiply = minColor.rgb / minColor.a;
vec3 maxColorUnpremultiply = maxColor.rgb / maxColor.a;
vec3 colorUnpremultiply = color.rgb / color.a;
vec3 range = maxColorUnpremultiply - minColorUnpremultiply;
gl_FragColor = vec4(color.a * (colorUnpremultiply - minColorUnpremultiply) / range, color.a);
}`,"min-max":{"min-max.frag":`#extension GL_EXT_draw_buffers : require
precision mediump float;
#define CELL_SIZE 2
uniform sampler2D u_minTexture;
uniform sampler2D u_maxTexture;
uniform vec2 u_srcResolution;
uniform vec2 u_dstResolution;
varying vec2 v_uv;
void main() {
vec2 srcPixel = floor(gl_FragCoord.xy) * float(CELL_SIZE);
vec2 onePixel = vec2(1.0) / u_srcResolution;
vec2 uv = (srcPixel + 0.5) / u_srcResolution;
vec4 minColor = vec4(1.0);
vec4 maxColor = vec4(0.0);
for (int y = 0; y < CELL_SIZE; ++y) {
for (int x = 0; x < CELL_SIZE; ++x) {
vec2 offset = uv + vec2(x, y) * onePixel;
minColor = min(minColor, texture2D(u_minTexture, offset));
maxColor = max(maxColor, texture2D(u_maxTexture, offset));
}
}
gl_FragData[0] = minColor;
gl_FragData[1] = maxColor;
}`}},"edge-detect":{"frei-chen":{"frei-chen.frag":`precision mediump float;
uniform sampler2D u_colorTexture;
uniform vec2 u_texSize;
varying vec2 v_uv;
vec2 texel = vec2(1.0 / u_texSize.x, 1.0 / u_texSize.y);
mat3 G[9];
const mat3 g0 = mat3( 0.3535533845424652, 0, -0.3535533845424652, 0.5, 0, -0.5, 0.3535533845424652, 0, -0.3535533845424652 );
const mat3 g1 = mat3( 0.3535533845424652, 0.5, 0.3535533845424652, 0, 0, 0, -0.3535533845424652, -0.5, -0.3535533845424652 );
const mat3 g2 = mat3( 0, 0.3535533845424652, -0.5, -0.3535533845424652, 0, 0.3535533845424652, 0.5, -0.3535533845424652, 0 );
const mat3 g3 = mat3( 0.5, -0.3535533845424652, 0, -0.3535533845424652, 0, 0.3535533845424652, 0, 0.3535533845424652, -0.5 );
const mat3 g4 = mat3( 0, -0.5, 0, 0.5, 0, 0.5, 0, -0.5, 0 );
const mat3 g5 = mat3( -0.5, 0, 0.5, 0, 0, 0, 0.5, 0, -0.5 );
const mat3 g6 = mat3( 0.1666666716337204, -0.3333333432674408, 0.1666666716337204, -0.3333333432674408, 0.6666666865348816, -0.3333333432674408, 0.1666666716337204, -0.3333333432674408, 0.1666666716337204 );
const mat3 g7 = mat3( -0.3333333432674408, 0.1666666716337204, -0.3333333432674408, 0.1666666716337204, 0.6666666865348816, 0.1666666716337204, -0.3333333432674408, 0.1666666716337204, -0.3333333432674408 );
const mat3 g8 = mat3( 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408, 0.3333333432674408 );
void main() {
G[0] = g0,
G[1] = g1,
G[2] = g2,
G[3] = g3,
G[4] = g4,
G[5] = g5,
G[6] = g6,
G[7] = g7,
G[8] = g8;
mat3 I;
float cnv[9];
vec3 sample;
for (float i = 0.0; i < 3.0; i++) {
for (float j = 0.0; j < 3.0; j++) {
sample = texture2D(u_colorTexture, v_uv + texel * vec2(i - 1.0,j - 1.0)).rgb;
I[int(i)][int(j)] = length(sample);
}
}
for (int i = 0; i < 9; i++) {
float dp3 = dot(G[i][0], I[0]) + dot(G[i][1], I[1]) + dot(G[i][2], I[2]);
cnv[i] = dp3 * dp3;
}
float M = (cnv[0] + cnv[1]) + (cnv[2] + cnv[3]);
float S = (cnv[4] + cnv[5]) + (cnv[6] + cnv[7]) + (cnv[8] + M);
gl_FragColor = vec4(vec3(sqrt(M / S)), texture2D(u_colorTexture, v_uv).a);
}`},sobel:{"sobel.frag":`precision mediump float;
uniform sampler2D u_colorTexture;
varying vec2 v_uv;
uniform vec2 u_texSize;
vec2 texel = vec2(1.0 / u_texSize.x, 1.0 / u_texSize.y);
mat3 G[2];
const mat3 g0 = mat3( 1.0, 2.0, 1.0, 0.0, 0.0, 0.0, -1.0, -2.0, -1.0 );
const mat3 g1 = mat3( 1.0, 0.0, -1.0, 2.0, 0.0, -2.0, 1.0, 0.0, -1.0 );
void main() {
mat3 I;
float cnv[2];
vec3 sample;
G[0] = g0;
G[1] = g1;
for (float i = 0.0; i < 3.0; i++) {
for (float j = 0.0; j < 3.0; j++) {
sample = texture2D( u_colorTexture, v_uv + texel * vec2(i-1.0,j-1.0) ).rgb;
I[int(i)][int(j)] = length(sample);
}
}
for (int i = 0; i < 2; i++) {
float dp3 = dot(G[i][0], I[0]) + dot(G[i][1], I[1]) + dot(G[i][2], I[2]);
cnv[i] = dp3 * dp3;
}
gl_FragColor = vec4(vec3(0.5 * sqrt(cnv[0] * cnv[0] + cnv[1] * cnv[1])), texture2D(u_colorTexture, v_uv).a);
}`}},"edge-enhance":{"edge-enhance.frag":`precision mediump float;
uniform sampler2D u_colorTexture;
varying vec2 v_uv;
uniform vec2 u_texSize;
vec2 texel = vec2(1.0 / u_texSize.x, 1.0 / u_texSize.y);
mat3 G[2];
const mat3 g0 = mat3( 1.0, 0.0, -1.0, 1.0, 0.0, -1.0, 1.0, 0.0, -1.0 );
const mat3 g1 = mat3( 1.0, 1.0, 1.0, 0.0, 0.0, 0.0, -1.0, -1.0, -1.0 );
void main() {
mat3 I;
float cnv[2];
vec3 sample;
G[0] = g0;
G[1] = g1;
for (float i = 0.0; i < 3.0; i++) {
for (float j = 0.0; j < 3.0; j++) {
sample = texture2D( u_colorTexture, v_uv + texel * vec2(i-1.0,j-1.0) ).rgb;
I[int(i)][int(j)] = length(sample);
}
}
for (int i = 0; i < 2; i++) {
float dp3 = dot(G[i][0], I[0]) + dot(G[i][1], I[1]) + dot(G[i][2], I[2]);
cnv[i] = dp3 * dp3;
}
vec4 color = texture2D(u_colorTexture, v_uv);
gl_FragColor = vec4(0.5 * sqrt(cnv[0] * cnv[0] + cnv[1] * cnv[1]) * color);
}`},filterEffect:{"filterEffect.frag":`precision mediump float;
uniform sampler2D u_colorTexture;
uniform mat4 u_coefficients;
varying vec2 v_uv;
void main() {
vec4 color = texture2D(u_colorTexture, v_uv);
vec4 rgbw = u_coefficients * vec4(color.a > 0.0 ? color.rgb / color.a : vec3(0.0), 1.0);
float a = color.a;
gl_FragColor = vec4(a * rgbw.rgb, a);
}`},pp:{"pp.vert":`precision mediump float;
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
gl_Position = vec4(a_position, 0.0, 1.0);
v_uv = (a_position + 1.0) / 2.0;
}`}},raster:{common:{"common.glsl":`uniform sampler2D u_image;
uniform int u_bandCount;
uniform bool u_flipY;
uniform float u_opacity;
uniform int u_resampling;
uniform vec2 u_srcImageSize;
#ifdef APPLY_PROJECTION
#include <raster/common/projection.glsl>
#endif
#ifdef BICUBIC
#include <filtering/bicubic.glsl>
#endif
#ifdef BILINEAR
#include <filtering/bilinear.glsl>
#endif
vec2 getPixelLocation(vec2 coords) {
vec2 targetLocation = u_flipY ? vec2(coords.s, 1.0 - coords.t) : coords;
#ifdef APPLY_PROJECTION
targetLocation = projectPixelLocation(targetLocation);
#endif
return targetLocation;
}
bool isOutside(vec2 coords){
if (coords.t>1.00001 ||coords.t<-0.00001 || coords.s>1.00001 ||coords.s<-0.00001) {
return true;
} else {
return false;
}
}
vec4 getPixel(vec2 pixelLocation) {
#ifdef BICUBIC
vec4 color = sampleBicubicBSpline(u_image, pixelLocation, u_srcImageSize);
#elif defined(BILINEAR)
vec4 color = sampleBilinear(u_image, pixelLocation, u_srcImageSize);
#else
vec4 color = texture2D(u_image, pixelLocation);
#endif
return color;
}`,"projection.glsl":`uniform sampler2D u_transformGrid;
uniform vec2 u_transformSpacing;
uniform vec2 u_transformGridSize;
uniform vec2 u_targetImageSize;
vec2 projectPixelLocation(vec2 coords) {
#ifdef LOOKUP_PROJECTION
vec4 pv = texture2D(u_transformGrid, coords);
return vec2(pv.r, pv.g);
#endif
vec2 index_image = floor(coords * u_targetImageSize);
vec2 oneTransformPixel = vec2(0.25 / u_transformGridSize.s, 1.0 / u_transformGridSize.t);
vec2 index_transform = floor(index_image / u_transformSpacing) / u_transformGridSize;
vec2 pos = fract((index_image + vec2(0.5, 0.5)) / u_transformSpacing);
vec2 srcLocation;
vec2 transform_location = index_transform + oneTransformPixel * 0.5;
if (pos.s <= pos.t) {
vec4 ll_abc = texture2D(u_transformGrid, vec2(transform_location.s, transform_location.t));
vec4 ll_def = texture2D(u_transformGrid, vec2(transform_location.s + oneTransformPixel.s, transform_location.t));
srcLocation.s = dot(ll_abc.rgb, vec3(pos, 1.0));
srcLocation.t = dot(ll_def.rgb, vec3(pos, 1.0));
} else {
vec4 ur_abc = texture2D(u_transformGrid, vec2(transform_location.s + 2.0 * oneTransformPixel.s, transform_location.t));
vec4 ur_def = texture2D(u_transformGrid, vec2(transform_location.s + 3.0 * oneTransformPixel.s, transform_location.t));
srcLocation.s = dot(ur_abc.rgb, vec3(pos, 1.0));
srcLocation.t = dot(ur_def.rgb, vec3(pos, 1.0));
}
return srcLocation;
}`},flow:{"getDisplayOpacity.glsl":`uniform float u_displayOpacity;
float getDisplayOpacity() {
return u_displayOpacity;
}`,"getFadeOpacity.glsl":`uniform float u_decayRate;
uniform float u_fadeToZero;
float getFadeOpacity(float x) {
float cutOff = mix(0.0, exp(-u_decayRate), u_fadeToZero);
return (exp(-u_decayRate * x) - cutOff) / (1.0 - cutOff);
}`,"getFragmentColor.glsl":`vec4 getFragmentColor(vec4 color, float dist, float size, float featheringSize) {
float featheringStart = clamp(0.5 - featheringSize / size, 0.0, 0.5);
if (dist > featheringStart) {
color *= 1.0 - (dist - featheringStart) / (0.5 - featheringStart);
}
return color;
}`,"getRangeOpacity.glsl":`uniform float u_startTime;
uniform float u_endTime;
float getRangeOpacity(float vertexTime, float cycle, float totalTime, float flowSpeed) {
float vTime = (vertexTime + cycle * totalTime) / flowSpeed;
if (vTime < u_startTime) {
return 0.0;
}
if (vTime > u_endTime) {
return 0.0;
}
return 1.0;
}`,"getTimeSeed.glsl":`float getTimeSeed(float firstTime, float lastTime) {
return mod(firstTime * 3.634f + lastTime * 5.153f + 7.381f, 1.0f);
}`,imagery:{"imagery.frag":`precision highp float;
varying vec2 v_texcoord;
uniform sampler2D u_texture;
uniform float u_Min;
uniform float u_Max;
uniform float u_featheringSize;
#include <raster/flow/vv.glsl>
float getIntensity(float v) {
return u_Min + v * (u_Max - u_Min);
}
void main(void) {
vec4 sampled = texture2D(u_texture, v_texcoord);
float intensity = getIntensity(sampled.r);
gl_FragColor = getColor(intensity);
gl_FragColor.a *= getOpacity(sampled.r);
gl_FragColor.a *= sampled.a;
gl_FragColor.rgb *= gl_FragColor.a;
}`,"imagery.vert":`attribute vec2 a_position;
attribute vec2 a_texcoord;
uniform mat3 u_dvsMat3;
varying vec2 v_texcoord;
void main(void) {
vec2 xy = (u_dvsMat3 * vec3(a_position, 1.0)).xy;
gl_Position = vec4(xy, 0.0, 1.0);
v_texcoord = a_texcoord;
}`},particles:{"particles.frag":`precision highp float;
varying vec4 v_color;
varying vec2 v_texcoord;
varying float v_size;
uniform float u_featheringSize;
#include <raster/flow/getFragmentColor.glsl>
void main(void) {
gl_FragColor = getFragmentColor(v_color, length(v_texcoord - 0.5), v_size, u_featheringSize);
}`,"particles.vert":`attribute vec4 a_xyts0;
attribute vec4 a_xyts1;
attribute vec4 a_typeIdFirstTimeLastTime;
attribute vec4 a_extrudeInfo;
uniform mat3 u_dvsMat3;
uniform mat3 u_displayViewMat3;
uniform float u_time;
uniform float u_trailLength;
uniform float u_flowSpeed;
varying vec4 v_color;
varying vec2 v_texcoord;
varying float v_size;
uniform float u_featheringSize;
uniform float u_introFade;
#include <raster/flow/vv.glsl>
#include <raster/flow/getFadeOpacity.glsl>
#include <raster/flow/getDisplayOpacity.glsl>
#include <raster/flow/getTimeSeed.glsl>
void main(void) {
float firstTime = a_typeIdFirstTimeLastTime.z;
float lastTime = a_typeIdFirstTimeLastTime.w;
float duration = lastTime - firstTime;
vec2 position0 = a_xyts0.xy;
float t0 = a_xyts0.z - firstTime;
float speed0 = a_xyts0.w;
vec2 position1 = a_xyts1.xy;
float t1 = a_xyts1.z - firstTime;
float speed1 = a_xyts1.w;
float type = a_typeIdFirstTimeLastTime.x;
float id = a_typeIdFirstTimeLastTime.y;
float seed = getTimeSeed(firstTime, lastTime);
vec2 e0 = a_extrudeInfo.xy;
vec2 e1 = a_extrudeInfo.zw;
float animationPeriod = duration + u_trailLength;
float scaledTime = u_time * u_flowSpeed;
float t = mod(scaledTime, animationPeriod);
float fUnclamped = (t - t0) / (t1 - t0);
float f = clamp(fUnclamped, 0.0, 1.0);
float clampedTime = mix(t0, t1, f);
float speed = mix(speed0, speed1, f);
vec2 extrude;
vec2 position;
float fadeOpacity;
float introOpacity;
if (type == 2.0) {
if (fUnclamped < 0.0 || (fUnclamped > 1.0 && t1 != duration)) {
gl_Position = vec4(0.0, 0.0, -2.0, 1.0);
return;
}
vec2 ortho = mix(e0, e1, f);
vec2 parallel;
parallel = normalize(position1 - position0) * 0.5;
if (id == 1.0) {
extrude = ortho;
v_texcoord = vec2(0.5, 0.0);
} else if (id == 2.0) {
extrude = -ortho;
v_texcoord = vec2(0.5, 1.0);
} else if (id == 3.0) {
extrude = ortho + parallel;
v_texcoord = vec2(1.0, 0.0);
} else if (id == 4.0) {
extrude = -ortho + parallel;
v_texcoord = vec2(1.0, 1.0);
}
fadeOpacity = getFadeOpacity((t - clampedTime) / u_trailLength);
introOpacity = 1.0 - exp(-clampedTime);
v_size = getSize(speed);
v_color = getColor(speed);
v_color.a *= getOpacity(speed);
position = mix(position0, position1, f);
} else {
if (fUnclamped < 0.0) {
gl_Position = vec4(0.0, 0.0, -2.0, 1.0);
return;
}
if (id == 1.0) {
extrude = e0;
v_texcoord = vec2(0.5, 0.0);
fadeOpacity = getFadeOpacity((t - t0) / u_trailLength);
introOpacity = 1.0 - exp(-t0);
v_size = getSize(speed0);
v_color = getColor(speed0);
v_color.a *= getOpacity(speed0);
position = position0;
} else if (id == 2.0) {
extrude = -e0;
v_texcoord = vec2(0.5, 1.0);
fadeOpacity = getFadeOpacity((t - t0) / u_trailLength);
introOpacity = 1.0 - exp(-t0);
v_size = getSize(speed0);
v_color = getColor(speed0);
v_color.a *= getOpacity(speed0);
position = position0;
} else if (id == 3.0) {
extrude = mix(e0, e1, f);
v_texcoord = vec2(0.5, 0.0);
fadeOpacity = getFadeOpacity((t - clampedTime) / u_trailLength);
introOpacity = 1.0 - exp(-clampedTime);
v_size = getSize(speed);
v_color = getColor(speed);
v_color.a *= getOpacity(speed);
position = mix(position0, position1, f);
} else if (id == 4.0) {
extrude = -mix(e0, e1, f);
v_texcoord = vec2(0.5, 1.0);
fadeOpacity = getFadeOpacity((t - clampedTime) / u_trailLength);
introOpacity = 1.0 - exp(-clampedTime);
v_size = getSize(speed);
v_color = getColor(speed);
v_color.a *= getOpacity(speed);
position = mix(position0, position1, f);
}
}
vec2 xy = (u_dvsMat3 * vec3(position, 1.0) + u_displayViewMat3 * vec3(extrude * v_size, 0.0)).xy;
gl_Position = vec4(xy, 0.0, 1.0);
v_color.a *= fadeOpacity;
v_color.a *= mix(1.0, introOpacity, u_introFade);
v_color.a *= getDisplayOpacity();
v_color.rgb *= v_color.a;
}`},streamlines:{"streamlines.frag":`precision highp float;
varying float v_side;
varying float v_time;
varying float v_firstTime;
varying float v_lastTime;
varying vec4 v_color;
varying float v_size;
uniform float u_time;
uniform float u_trailLength;
uniform float u_flowSpeed;
uniform float u_featheringSize;
uniform float u_introFade;
#include <raster/flow/getFragmentColor.glsl>
#include <raster/flow/getFadeOpacity.glsl>
#include <raster/flow/getRangeOpacity.glsl>
#include <raster/flow/getDisplayOpacity.glsl>
#include <raster/flow/getTimeSeed.glsl>
void main(void) {
float totalTime = v_lastTime - v_firstTime;
float trailLength = u_trailLength;
float period = totalTime + trailLength;
float seed = getTimeSeed(v_firstTime, v_lastTime);
float t = mod(seed * period + u_time * u_flowSpeed, period) + v_firstTime - v_time;
float fading = t / trailLength;
vec4 color = v_color;
color *= getDisplayOpacity();
color *= fading < 0.0 ? 0.0 : getFadeOpacity(fading);
gl_FragColor = getFragmentColor(color, length((v_side + 1.0) / 2.0 - 0.5), v_size, u_featheringSize);
}`,"streamlines.vert":`attribute vec3 a_positionAndSide;
attribute vec3 a_timeInfo;
attribute vec2 a_extrude;
attribute float a_speed;
uniform mat3 u_dvsMat3;
uniform mat3 u_displayViewMat3;
varying float v_time;
varying float v_firstTime;
varying float v_lastTime;
varying vec4 v_color;
varying float v_side;
varying float v_size;
uniform float u_featheringSize;
#include <raster/flow/vv.glsl>
void main(void) {
vec4 lineColor = getColor(a_speed);
float lineOpacity = getOpacity(a_speed);
float lineSize = getSize(a_speed);
vec2 position = a_positionAndSide.xy;
v_side = a_positionAndSide.z;
vec2 xy = (u_dvsMat3 * vec3(position, 1.0) + u_displayViewMat3 * vec3(a_extrude * lineSize, 0.0)).xy;
gl_Position = vec4(xy, 0.0, 1.0);
v_time = a_timeInfo.x;
v_firstTime = a_timeInfo.y;
v_lastTime = a_timeInfo.z;
v_color = lineColor;
v_color.a *= lineOpacity;
v_color.rgb *= v_color.a;
v_size = lineSize;
}`},"vv.glsl":`#define MAX_STOPS 8
#ifdef VV_COLOR
uniform float u_color_stops[MAX_STOPS];
uniform vec4 u_color_values[MAX_STOPS];
uniform int u_color_count;
#else
uniform vec4 u_color;
#endif
#ifdef VV_OPACITY
uniform float u_opacity_stops[MAX_STOPS];
uniform float u_opacity_values[MAX_STOPS];
uniform int u_opacity_count;
#else
uniform float u_opacity;
#endif
#ifdef VV_SIZE
uniform float u_size_stops[MAX_STOPS];
uniform float u_size_values[MAX_STOPS];
uniform int u_size_count;
#else
uniform float u_size;
#endif
uniform float u_featheringOffset;
vec4 getColor(float x) {
#ifdef VV_COLOR
vec4 color = u_color_values[0];
{
for (int i = 1; i < MAX_STOPS; i++) {
if (i >= u_color_count) {
break;
}
float x1 = u_color_stops[i - 1];
if (x < x1) {
break;
}
float x2 = u_color_stops[i];
vec4 y2 = u_color_values[i];
if (x < x2) {
vec4 y1 = u_color_values[i - 1];
color = y1 + (y2 - y1) * (x - x1) / (x2 - x1);
} else {
color = y2;
}
}
}
#else
vec4 color = u_color;
#endif
return color;
}
float getOpacity(float x) {
#ifdef VV_OPACITY
float opacity = u_opacity_values[0];
{
for (int i = 1; i < MAX_STOPS; i++) {
if (i >= u_opacity_count) {
break;
}
float x1 = u_opacity_stops[i - 1];
if (x < x1) {
break;
}
float x2 = u_opacity_stops[i];
float y2 = u_opacity_values[i];
if (x < x2) {
float y1 = u_opacity_values[i - 1];
opacity = y1 + (y2 - y1) * (x - x1) / (x2 - x1);
} else {
opacity = y2;
}
}
}
#else
float opacity = u_opacity;
#endif
return opacity;
}
float getSize(float x) {
#ifdef VV_SIZE
float size = u_size_values[0];
{
for (int i = 1; i < MAX_STOPS; i++) {
if (i >= u_size_count) {
break;
}
float x1 = u_size_stops[i - 1];
if (x < x1) {
break;
}
float x2 = u_size_stops[i];
float y2 = u_size_values[i];
if (x < x2) {
float y1 = u_size_values[i - 1];
size = y1 + (y2 - y1) * (x - x1) / (x2 - x1);
} else {
size = y2;
}
}
}
#else
float size = u_size;
#endif
return size + 2.0 * u_featheringSize * u_featheringOffset;
}`},reproject:{"reproject.frag":`precision mediump float;
varying vec2 v_texcoord;
#include <raster/common/common.glsl>
void main() {
vec2 pixelLocation = getPixelLocation(v_texcoord);
if (isOutside(pixelLocation)) {
gl_FragColor = vec4(0.0, 0.0, 0.0, 0.0);
return;
}
vec4 currentPixel = getPixel(pixelLocation);
gl_FragColor = vec4(currentPixel.rgb, 1.0) * currentPixel.a * u_opacity;
}`,"reproject.vert":`precision mediump float;
attribute vec2 a_position;
varying highp vec2 v_texcoord;
void main()
{
v_texcoord = a_position;
gl_Position = vec4(2.0 * (a_position - 0.5), 0.0, 1.0);
}`}},stencil:{"stencil.frag":`void main() {
gl_FragColor = vec4(1.0, 1.0, 1.0, 1.0);
}`,"stencil.vert":`attribute vec2 a_pos;
uniform mat3 u_worldExtent;
void main() {
gl_Position = vec4(u_worldExtent * vec3(a_pos, 1.0), 1.0);
}`},test:{"TestShader.common.glsl":`#ifndef RETURN_RED
varying    vec4      v_color;
#endif
varying    vec2      v_offset;`,"TestShader.frag":`precision highp float;
#include <test/TestShader.common.glsl>
void main() {
if (v_offset.x > -.5 && v_offset.y > -.5 && v_offset.x < .5 && v_offset.y < .5) {
discard;
}
#ifdef RETURN_RED
gl_FragColor = vec4(1., 0., 0., 1.);
#else
gl_FragColor = v_color;
#endif
}`,"TestShader.vert":`const float POS_PRECISION_FACTOR = 10.;
const float OFFSET_PRECISION_FACTOR = 10.;
const float SIZE_PRECISION_FACTOR = 10.;
attribute  vec2      a_pos_packed;
attribute  vec2      a_offset_packed;
attribute  float     a_size_packed;
#ifdef DATA_DRIVEN_COLOR
const float u_dataDrivenColor_validValues[4] = float[4](0., 0., 1., 0.);
uniform    vec4      u_dataDrivenColor_colorFallback;
uniform    vec4      u_dataDrivenColor_color;
#endif
uniform    float     u_view_zoomLevel;
#include <test/TestShader.common.glsl>
#ifdef DATA_DRIVEN_COLOR
vec4 getColor(float value) {
int index = -1;
for (int i = 0; i < 4; i++) {
if (u_dataDrivenColor_validValues[i] == value) {
index = i;
break;
}
}
if (index == -1) {
return u_dataDrivenColor_colorFallback;
}
return u_dataDrivenColor_color;
}
#endif
void main() {
vec2  a_pos = a_pos_packed / POS_PRECISION_FACTOR;
vec2  a_offset = a_offset_packed / OFFSET_PRECISION_FACTOR;
float a_size = a_size_packed / SIZE_PRECISION_FACTOR;
vec4 color = vec4(1., 0., 0., 1.);
#ifdef DATA_DRIVEN_COLOR
color = getColor(1.);
#endif
vec2 offsetScaled = a_offset * a_size;
vec4 pos = vec4(a_pos.xy + offsetScaled, 0., 1.);
gl_Position = pos;
#ifndef RETURN_RED
v_color = color;
#endif
v_offset = a_offset;
}`},util:{"atan2.glsl":`float atan2(in float y, in float x) {
float t0, t1, t2, t3, t4;
t3 = abs(x);
t1 = abs(y);
t0 = max(t3, t1);
t1 = min(t3, t1);
t3 = 1.0 / t0;
t3 = t1 * t3;
t4 = t3 * t3;
t0 =         - 0.013480470;
t0 = t0 * t4 + 0.057477314;
t0 = t0 * t4 - 0.121239071;
t0 = t0 * t4 + 0.195635925;
t0 = t0 * t4 - 0.332994597;
t0 = t0 * t4 + 0.999995630;
t3 = t0 * t3;
t3 = (abs(y) > abs(x)) ? 1.570796327 - t3 : t3;
t3 = x < 0.0 ?  3.141592654 - t3 : t3;
t3 = y < 0.0 ? -t3 : t3;
return t3;
}`,"encoding.glsl":`const vec4 rgba2float_factors = vec4(
255.0 / (256.0),
255.0 / (256.0 * 256.0),
255.0 / (256.0 * 256.0 * 256.0),
255.0 / (256.0 * 256.0 * 256.0 * 256.0)
);
float rgba2float(vec4 rgba) {
return dot(rgba, rgba2float_factors);
}`}};function ca(o){return function(e){let t=o;return e.split("/").forEach(i=>{t&&(t=t[i])}),t}}const da=new sa(ca(ua));function vn(o){return da.resolveIncludes(o)}let Je=class extends k{};r([m(a)],Je.prototype,"globalTime",void 0),r([m(g)],Je.prototype,"animationTextureSize",void 0),r([m(G)],Je.prototype,"toScreen",void 0),r([m(G)],Je.prototype,"toNdc",void 0),r([m(a)],Je.prototype,"mapRotation",void 0),r([m(a)],Je.prototype,"pixelRatio",void 0),r([m(a)],Je.prototype,"scaleAdjustment",void 0);let $e=class extends On{getVisualVariableData(e){return this._vvData||(this._vvData=Y(this.visualVariableData,e).setDebugName("storage2")),this._vvData}getFilterData(e){return Y(this.filterFlags,e).setDebugName("storage0")}getAnimationData(e){return Y(this.animation,e).setDebugName("storage1")}getVVData(e){return this.getVisualVariableData(e)}getDataDrivenData0(e){return Y(this.dataDriven0,e).setDebugName("storage30")}getDataDrivenData1(e){return Y(this.dataDriven1,e).setDebugName("storage31")}getDataDrivenData2(e){return Y(this.dataDriven2,e).setDebugName("storage32")}getGPGPUData(e){return Y(this.gpgpu,e).setDebugName("storage4")}getLocalTimeOrigin(e){return Y(this.localTimeOrigin,e).x.setDebugName("storage5")}getFilterFlags(e){return tt("webgl-ignores-sampler-precision")?Ao(this.getFilterData(e).x.multiply(Ve(255))):this.getFilterData(e).x.multiply(Ve(255))}getLabelVisibility(e){const t=this.getFilterData(e).y.multiply(255);return new a(1).subtract(t)}getAnimationValue(e){return this.getAnimationData(e).x}getSizeValue(e){return this.getVisualVariableData(e).x}getColorValue(e){return this.getVisualVariableData(e).y}getOpacityValue(e){return this.getVisualVariableData(e).z}getRotationValue(e){return this.getVisualVariableData(e).w}};r([H($)],$e.prototype,"filterFlags",void 0),r([H($)],$e.prototype,"animation",void 0),r([H($)],$e.prototype,"gpgpu",void 0),r([H($)],$e.prototype,"localTimeOrigin",void 0),r([H($)],$e.prototype,"visualVariableData",void 0),r([H($)],$e.prototype,"dataDriven0",void 0),r([H($)],$e.prototype,"dataDriven1",void 0),r([H($)],$e.prototype,"dataDriven2",void 0);let Ln=class extends k{getAttributeDataCoords(e){if(!this._uv){const t=Xo(e),i=this.size,n=Tt(t.x),s=Tt(t.y).multiply(Tt(256)),l=Tt(t.z).multiply(Tt(256)).multiply(Tt(256)),u=Ve(n.add(s).add(l)),c=Ke(u,i),p=u.subtract(c).divide(i);this._uv=new g(c,p).add(.5).divide(i)}return this._uv}};r([m(a)],Ln.prototype,"size",void 0);let Ei=class extends k{};r([m(a)],Ei.prototype,"activeReasons",void 0),r([m(a)],Ei.prototype,"highlightAll",void 0);let wt=class extends k{};r([m(g)],wt.prototype,"position",void 0),r([m(a)],wt.prototype,"distance",void 0),r([m(a)],wt.prototype,"smallSymbolDistance",void 0),r([m(a)],wt.prototype,"smallSymbolSizeThreshold",void 0),r([m(S)],wt.prototype,"tlbr",void 0);let re=class extends k{};r([m(G)],re.prototype,"displayViewScreenMat3",void 0),r([m(G)],re.prototype,"displayViewMat3",void 0),r([m(G)],re.prototype,"displayMat3",void 0),r([m(G)],re.prototype,"viewMat3",void 0),r([m(G)],re.prototype,"tileMat3",void 0),r([m(a)],re.prototype,"displayZoomFactor",void 0),r([m(a)],re.prototype,"requiredZoomFactor",void 0),r([m(g)],re.prototype,"tileOffset",void 0),r([m(a)],re.prototype,"currentScale",void 0),r([m(a)],re.prototype,"currentZoom",void 0),r([m(a)],re.prototype,"metersPerSRUnit",void 0),r([m(a)],re.prototype,"rotation",void 0),r([m(a)],re.prototype,"pixelRatio",void 0),r([m(a)],re.prototype,"scaleFactor",void 0);let Ie=class extends Ft{};r([v(0,D)],Ie.prototype,"id",void 0),r([v(1,a)],Ie.prototype,"bitset",void 0),r([v(2,g)],Ie.prototype,"pos",void 0);let Ce=class extends Jt{};r([v(14,g)],Ce.prototype,"nextPos1",void 0),r([v(15,g)],Ce.prototype,"nextPos2",void 0);let De=class extends Qt{},ue=class extends Rt{clip(e,t){let i=new a(0);const n=this.getFilterFlags(e);if(i=i.add(Ve(2).multiply(Ve(1).subtract(Pi(n,0)))),this.inside?i=i.add(Ve(2).multiply(Ve(1).subtract(Pi(n,1)))):this.outside?i=i.add(Ve(2).multiply(Pi(n,1))):this.highlight&&(i=i.add(Ve(2).multiply(Ve(1).subtract(this._checkHighlight(n))))),t!=null){const s=new a(1).subtract(W(t.x,this.view.currentZoom)),l=W(t.y,this.view.currentZoom);i=i.add(new a(2).multiply(s.add(l)))}return i}getFragmentOutput(e,t,i=new a(1/255)){const n=new St;return n.fragColor=this._maybeWriteHittest(t)??this._maybeHighlight(e,i)??e,n}_maybeHighlight(e,t){return this.highlight?new S(e.rgb,W(t,e.a)):null}_checkHighlight(e){let t=this._checkHighlightBit(e,0);for(let i=1;i<go;i++)t=t.add(this._checkHighlightBit(e,i));return W(new a(.1),t.add(this.highlight.highlightAll))}_checkHighlightBit(e,t){return Jo(e,t).multiply(K(this.highlight.activeReasons,t))}computeHittestTriangle(e,t,i){const{viewMat3:n,tileMat3:s}=this.view,l=n.multiply(s),{nextPos1:u,nextPos2:c}=t;return{pos0:l.multiply(new D(e.pos,1)).xy,pos1:l.multiply(new D(u,1)).xy,pos2:l.multiply(new D(c,1)).xy}}maybeRunHittest(e,t,i){if(this.hittestRequest==null)return null;const n=this.hittest(e,t,i),s=N(n,new a(fe)),l=N(n,new a(Vn)),u=x(l,()=>new S(new a(1/255),0,0,0),x(s,()=>new S(new a(2/255),0,0,0),new S(X)));let c=x(Se(s,l),new a(0),new a(2));const p=this.getAttributeDataCoords(e.id),d=Qo(p);return c=c.add(this.clip(e.id,e.zoomRange)),{glPointSize:new a(1),glPosition:new S(d,c,1),color:u}}_maybeWriteHittest(e){return this.hittestRequest!=null?e.color:null}getAttributeDataCoords(e){return this.storage.getAttributeDataCoords(e)}getVVData(e){return this.storageTextures.getVVData(this.getAttributeDataCoords(e))}getFilterFlags(e){return this.storageTextures.getFilterFlags(this.getAttributeDataCoords(e))}getLocalTimeOrigin(e){return this.storageTextures.getLocalTimeOrigin(this.getAttributeDataCoords(e))}getSizeValue(e){return this.storageTextures.getSizeValue(this.getAttributeDataCoords(e))}getColorValue(e){return this.storageTextures.getColorValue(this.getAttributeDataCoords(e))}getOpacityValue(e){return this.storageTextures.getOpacityValue(this.getAttributeDataCoords(e))}getRotationValue(e){return this.storageTextures.getRotationValue(this.getAttributeDataCoords(e))}};r([le],ue.prototype,"inside",void 0),r([le],ue.prototype,"outside",void 0),r([M(Ei)],ue.prototype,"highlight",void 0),r([m(Ln)],ue.prototype,"storage",void 0),r([H($e)],ue.prototype,"storageTextures",void 0),r([m(re)],ue.prototype,"view",void 0),r([M(wt)],ue.prototype,"hittestRequest",void 0);let ht=class extends k{getPatternOffsetAtTileOrigin(e,t=new a(0),i=new a(1)){const n=new g($o).divide(e);let s=e.multiply(Ri(this.maxIntsToLocalOrigin.multiply(n))).add(this.tileOffsetFromLocalOrigin).subtract(new a(.5).multiply(e));return s=new g(s.x.multiply(i).subtract(s.y.multiply(t)),s.x.multiply(t).add(s.y.multiply(i))),Ke(s,e)}};r([m(g)],ht.prototype,"tileOffsetFromLocalOrigin",void 0),r([m(g)],ht.prototype,"maxIntsToLocalOrigin",void 0);let Re=class extends k{};r([m(g)],Re.prototype,"size",void 0);let st=class extends k{getColor(e,t,i){return ce([Se(je(e),i),t],[Le(e,this.values.first()),this.colors.first()],[de(e,this.values.last()),this.colors.last()],[!0,()=>{const n=this.values.findIndex(p=>F(p,e)),s=this.values.get(n),l=n.subtract(1),u=this.values.get(l),c=e.subtract(u).divide(s.subtract(u));return B(this.colors.get(l),this.colors.get(n),c)}])}};r([m(pe.ofType(S,8))],st.prototype,"colors",void 0),r([m(pe.ofType(a,8))],st.prototype,"values",void 0);let lt=class extends k{getOpacity(e){return ce([je(e),new a(1)],[Le(e,this.opacityValues.first()),this.opacities.first()],[de(e,this.opacityValues.last()),this.opacities.last()],[!0,()=>{const t=this.opacityValues.findIndex(u=>F(u,e)),i=this.opacityValues.get(t),n=t.subtract(1),s=this.opacityValues.get(n),l=e.subtract(s).divide(i.subtract(s));return B(this.opacities.get(n),this.opacities.get(t),l)}])}};r([m(pe.ofType(a,8))],lt.prototype,"opacities",void 0),r([m(pe.ofType(a,8))],lt.prototype,"opacityValues",void 0);let xi=class extends k{getVVRotationMat4(e){return x(je(e),pi.identity(),()=>{const t=this.getNormalizedAngle(e).multiply(cn),i=it(t),n=nt(t);return new pi(n,i,0,0,i.multiply(new a(-1)),n,0,0,0,0,1,0,0,0,0,1)})}getVVRotationMat3(e){return x(je(e),G.identity(),()=>{const t=this.getNormalizedAngle(e).multiply(cn),i=it(t),n=nt(t);return new G(n,i,0,i.multiply(new a(-1)),n,0,0,0,1)})}getNormalizedAngle(e){const t=N(this.rotationType,new a(1));return x(t,new a(90).subtract(e),e)}};r([m(a)],xi.prototype,"rotationType",void 0);let Et=class extends k{getSize(e,t){const i=this.minMaxValueAndSize.xy,n=this.minMaxValueAndSize.zw;return x(je(e),t,()=>{const s=e.subtract(i.x).divide(i.y.subtract(i.x)),l=_e(s,new a(0),new a(1));return n.x.add(l.multiply(n.y.subtract(n.x)))})}};r([m(S)],Et.prototype,"minMaxValueAndSize",void 0);let yt=class extends k{getSizeForViewScale(e){return ce([Le(e,this.values.first()),this.sizes.first()],[de(e,this.values.last()),this.sizes.last()],[!0,()=>{const t=this.values.findIndex(u=>F(u,e)),i=this.values.get(t),n=t.subtract(1),s=this.values.get(n),l=e.subtract(s).divide(i.subtract(s));return B(this.sizes.get(n),this.sizes.get(t),l)}])}};r([m(pe.ofType(a,8))],yt.prototype,"sizes",void 0),r([m(pe.ofType(a,8))],yt.prototype,"values",void 0);let xt=class extends k{getSize(e,t){const i=ce([je(e),t],[Le(e,this.values.first()),this.sizes.first()],[de(e,this.values.last()),this.sizes.last()],[!0,()=>{const n=this.values.findIndex(p=>F(p,e)),s=this.values.get(n),l=n.subtract(1),u=this.values.get(l),c=e.subtract(u).divide(s.subtract(u));return B(this.sizes.get(l),this.sizes.get(n),c)}]);return x(je(i),t,i)}};r([m(pe.ofType(a,8))],xt.prototype,"sizes",void 0),r([m(pe.ofType(a,8))],xt.prototype,"values",void 0);let Lt=class extends k{getSize(e,t){return x(je(e),t,e.multiply(this.unitValueToPixelsRatio))}};r([m(a)],Lt.prototype,"unitValueToPixelsRatio",void 0);function Mn(o){return o.visualVariableSizeMinMaxValue!=null||o.visualVariableSizeScaleStops!=null||o.visualVariableSizeStops!=null||o.visualVariableSizeUnitValue!=null}function jt(o,e,t){if(Mn(o)){const i=o.getSizeValue(e);return o.visualVariableSizeMinMaxValue?.getSize(i,t)??o.visualVariableSizeScaleStops?.getSizeForViewScale(o.view.currentScale)??o.visualVariableSizeStops?.getSize(i,t)??o.visualVariableSizeUnitValue?.getSize(i,t)}return t}function Mt(o,e,t,i=new Vt(!1)){if(o.visualVariableColor==null)return t;const n=o.getColorValue(e);return o.visualVariableColor.getColor(n,t,i)}function Nt(o,e){if(o.visualVariableOpacity==null)return new a(1);const t=o.getOpacityValue(e);return o.visualVariableOpacity.getOpacity(t)}function Nn(o,e){if(o.visualVariableRotation==null)return G.identity();const t=o.getRotationValue(e);return o.visualVariableRotation.getVVRotationMat3(t)}function pa(o,e){if(o.visualVariableRotation==null)return new a(0);const t=o.getRotationValue(e);return o.visualVariableRotation.getNormalizedAngle(t)}let Qe=class extends Ie{};r([v(3,g)],Qe.prototype,"offset",void 0),r([v(4,S)],Qe.prototype,"sizing",void 0),r([v(5,S)],Qe.prototype,"value1Position2Value2",void 0),r([v(6,S)],Qe.prototype,"animationPointerAndBaseSizeAndReferenceSize",void 0),r([v(7,g)],Qe.prototype,"zoomRange",void 0),r([v(8,a)],Qe.prototype,"lineLength",void 0);let $n=class extends De{},ve=class extends ue{_vertexPreamble(e,t,i){const{id:n,offset:s,animationPointerAndBaseSizeAndReferenceSize:l,sizing:u}=e,c=l.xy,p=l.z,d=l.w,f=u.xy,h=this._getEvalParams(e,f,i);let _,y;if(e.value1Position2Value2){let U;U=this.hittestRequest?new a(0):xe(c,6,h).a.multiply(this.animationInfo.scaleAdjustment);const ae=e.pos,be=e.value1Position2Value2.yz,ti=e.value1Position2Value2.x,Ii=e.value1Position2Value2.w,$t=U.subtract(ti).divide(Ii.subtract(ti));y=ae.add(be.subtract(ae).multiply($t)),_=W(new a(1),$t).add(W(new a(0),ee($t)))}else y=e.pos,_=new a(0);const b=u.z,w=K(e.bitset,ye.bitset.isStroke),O=u.w,T=K(e.bitset,ye.bitset.scaleSymbolsProportionally),P=xe(c,0,h),R=ce([N(K(e.bitset,ye.bitset.isMapAligned),new a(1)),this.view.rotation.divide(180).multiply(Math.PI)],[!0,new a(0)]),A=new Vo(nt(R),it(R.multiply(-1)),it(R),nt(R)).multiply(P.xy),V=P.z.subtract(R).subtract(t),E=P.w,L=K(e.bitset,ye.bitset.isSDF),z=jt(this,n,new a(d)).divide(new a(d));return{baseSize:p,animationPointer:c,strokeWidth:b,isOutline:w,unscaledDistanceToPx:O,scaleSymbolsProportionally:T,isSDF:L,position:this._getScreenPosition({id:n,pos:y,offset:s,referenceSize:d,translation:A,rotation:V,scale:E,vvScale:z}),evalParams:h,vvScale:z,scale:E,clip:_}}_getScreenPosition(e){const{pos:t,translation:i,rotation:n,scale:s,offset:l,id:u,vvScale:c}=e,p=pa(this,u).multiply(Math.PI/180),d=i.x.multiply(4/3),f=i.y.multiply(-1).multiply(4/3),h=it(p),_=nt(p),y=_.multiply(d).add(ee(h).multiply(f)),b=h.multiply(d).add(_.multiply(f)),w=it(n.subtract(p)),O=nt(n.subtract(p)),T=new a(0),P=new a(1),{pixelRatio:R}=this.animationInfo,A=new G(P,T,T,T,P,T,y.multiply(R),b.multiply(R),P),V=new G(O,w.multiply(-1),T,w,O,T,0,0,P),E=s.multiply(c).multiply(R).multiply(4/3),L=V.multiply(E),z=this.animationInfo.toScreen.multiply(new D(t,1)),U=A.multiply(z).xy,ae=L.multiply(new D(l,0)).xy;return U.add(ae)}_clip(e,t){let i=super.clip(e,t);const n=Le(this._getLocalTimeOrigin(e),new a(0));return qi.forceGlobalTimeOrigin||(i=i.add(ce([n,()=>new a(2)],[!0,()=>new a(0)]))),i}_getLocalTimeOrigin(e){return this.getLocalTimeOrigin(e)}_toNdc(e){return this.animationInfo.toNdc.multiply(new D(e,1)).xy}_getEvalParams(e,t,i){const{globalTime:n,animationTextureSize:s}=this.animationInfo;return{globalTime:n,localTimeOrigin:this._getLocalTimeOrigin(e.id),animationTextureSize:s,animationTexture:this.animationTexture,pixelDimensions:t,lineLength:i}}_getColor(e,t){return x(N(t.isSDF,new a(1)),this._getSDFColor(e,t),this._getSpriteColor(e,t))}_getSpriteColor(e,t){return Y(this.mosaicTexture,e).multiply(t.color)}_getSDFColor(e,t){const i=Y(this.mosaicTexture,e),n=new a(.5).subtract(yi(i)).multiply(t.distanceToPx).multiply(Dn),s=_e(new a(.5).subtract(n),new a(0),new a(1)),l=t.color.multiply(s),u=t.outlineSize.multiply(.5),c=ei(n).subtract(u),p=_e(new a(.5).subtract(c),new a(0),new a(1)),d=t.outlineColor.multiply(p);return new a(1).subtract(d.a).multiply(l).add(d)}};function xe(o,e,t){const i=o.add(new g(e,0)),n=Y(t.animationTexture,i.add(.5).divide(t.animationTextureSize)).xy;return o=o.add(n),Po({animationPointer:o,...t},S,null,s=>{const{out:l}=s;if(!l)throw new Error("out is null");return No({...s,out:l})})}r([m(Re)],ve.prototype,"mosaicInfo",void 0),r([m(Je)],ve.prototype,"animationInfo",void 0),r([m(ht)],ve.prototype,"localTileOffset",void 0),r([H($)],ve.prototype,"mosaicTexture",void 0),r([M(st)],ve.prototype,"visualVariableColor",void 0),r([M(lt)],ve.prototype,"visualVariableOpacity",void 0),r([M(Et)],ve.prototype,"visualVariableSizeMinMaxValue",void 0),r([M(yt)],ve.prototype,"visualVariableSizeScaleStops",void 0),r([M(xt)],ve.prototype,"visualVariableSizeStops",void 0),r([M(Lt)],ve.prototype,"visualVariableSizeUnitValue",void 0),r([M(xi)],ve.prototype,"visualVariableRotation",void 0),r([H($)],ve.prototype,"animationTexture",void 0);let fi=class extends Qe{};r([v(9,S)],fi.prototype,"tlbr",void 0),r([v(10,a)],fi.prototype,"angle",void 0);let mi=class extends Jt{};r([v(13,g)],mi.prototype,"nextPos1",void 0),r([v(14,g)],mi.prototype,"nextPos2",void 0);let Bn=class extends $n{},Hn=class extends ve{constructor(){super(...arguments),this.computeAttributes={pos:["nextPos1","nextPos2"]}}_fragmentPoly(e){const t=Ke(e.uv,new a(1)),i=B(e.tlbr.xy,e.tlbr.zw,t);return this._getColor(i,{color:e.color,distanceToPx:e.distanceToPx,isSDF:e.isSDF,outlineColor:e.outlineColor,outlineSize:e.strokeWidth})}_vertexPoly(e){const{position:t,animationPointer:i,evalParams:n,isOutline:s,unscaledDistanceToPx:l,vvScale:u,strokeWidth:c,scaleSymbolsProportionally:p,scale:d,isSDF:f,baseSize:h,clip:_}=this._vertexPreamble(e,new a(0),e.lineLength||new a(0)),y=this._toNdc(t);let b=xe(i,1,n);b=new S(b.rgb.multiply(b.a),b.a);let w=x(rt(e.bitset,ye.bitset.colorLocked),b,xe(i,2,n));w=new S(w.rgb.multiply(w.a),w.a);let O=xe(i,3,n);O=new S(O.rgb.multiply(O.a),O.a);const T=xe(i,4,n).a,P=xe(i,5,n).a,R=Mt(this,e.id,b,Se(rt(e.bitset,ye.bitset.colorLocked),new Vt(s))),A=B(R,w,O),V=Nt(this,e.id),E=B(V,T,P),L=A.multiply(E),z=this.clip(e.id,e.zoomRange).add(_.multiply(2)),U=l.multiply(u);return{unscaledDistanceToPx:l,vvScale:u,strokeWidth:c,scaleSymbolsProportionally:p,scale:d,isSDF:f,baseSize:h,ndc:y,color:L,z,isOutline:s,evalParams:n,distanceToPx:U}}};function fa(o,e){return _t(o,In(e))}function gt(o,e,t){const i=t.subtract(e),n=fa(o.subtract(e),i),s=_e(n.divide(ot(i)),new a(0),new a(1));return hi(o,e.add(s.multiply(t.subtract(e))))}function Z(o){const e=ei(o);return W(e.x.add(e.y).add(e.z),new a(1.05))}function q(o,e,t,i){const n=new G(t.x.multiply(i.y).subtract(i.x.multiply(t.y)),i.x.multiply(e.y).subtract(e.x.multiply(i.y)),e.x.multiply(t.y).subtract(t.x.multiply(e.y)),t.y.subtract(i.y),i.y.subtract(e.y),e.y.subtract(t.y),i.x.subtract(t.x),e.x.subtract(i.x),t.x.subtract(e.x)),s=e.x.multiply(t.y.subtract(i.y)),l=t.x.multiply(i.y.subtract(e.y)),u=i.x.multiply(e.y.subtract(t.y)),c=s.add(l).add(u);return new a(1).divide(c).multiply(n.multiply(new D(1,o)))}function ma(o,e,t,i){return N(Z(q(o,e,t,i)),new a(1))}function Si(o,e,t,i){const n=t.subtract(e),s=i.subtract(e),l=ea(n,s),u=te(at(l,new a(dn)),F(l,new a(-dn)));return ce([te(zn(u),ma(o.xy,e,t,i)),new a(-1)],[!0,()=>{const c=gt(o,e,t),p=gt(o,t,i),d=gt(o,i,e);return qe(qe(c,p),d)}])}function bi(o,e,t){const{viewMat3:i,tileMat3:n}=o.view,s=i.multiply(n),l=s.multiply(new D(e.pos,1)),u=s.multiply(new D(t.nextPos1,1)),c=s.multiply(new D(t.nextPos2,1));return Si(o.hittestRequest.position,l.xy,u.xy,c.xy)}function va(o,e,t){return hi(o,t).subtract(e)}function Te(o,e,t,i){const n=o.x,s=o.y,l=e.x,u=e.y,c=t.x,p=t.y,d=i.x,f=i.y,h=d.subtract(c),_=n.subtract(c),y=l.subtract(n),b=f.subtract(p),w=s.subtract(p),O=u.subtract(s),T=b.multiply(y).subtract(h.multiply(O)),P=h.multiply(w).subtract(b.multiply(_)).divide(T),R=y.multiply(w).subtract(O.multiply(_)).divide(T),A=te(zn(N(T,new a(0))),te(te(de(P,new a(0)),Le(P,new a(1))),te(de(R,new a(0)),Le(R,new a(1)))));return x(A,new a(1),new a(0))}function Vi(o,e,t,i,n){return te(te(de(o.x,e),de(o.y,t)),te(at(o.x,i),Le(o.y,n)))}function Gn(o,e,t,i){const n=i.xy,s=i.zw,l=new g(s.x,n.y),u=new g(n.x,s.y),c=qe(n.x,s.x),p=qe(n.y,s.y),d=ge(n.x,s.x),f=ge(n.y,s.y),h=q(new g(c,p),o,e,t),_=q(new g(d,f),o,e,t),y=q(new g(c,f),o,e,t),b=q(new g(d,p),o,e,t),w=te(N(Z(h),new a(1)),te(N(Z(_),new a(1)),te(N(Z(y),new a(1)),N(Z(b),new a(1))))),O=Te(n,l,o.xy,e.xy).add(Te(l,s,o.xy,e.xy)).add(Te(u,s,o.xy,e.xy)).add(Te(u,n,o.xy,e.xy)),T=Te(n,l,o.xy,t.xy).add(Te(l,s,o.xy,t.xy)).add(Te(u,s,o.xy,t.xy)).add(Te(u,n,o.xy,t.xy)),P=Te(n,l,e.xy,t.xy).add(Te(l,s,e.xy,t.xy)).add(Te(u,s,e.xy,t.xy)).add(Te(u,n,e.xy,t.xy)),R=Vi(o.xy,c,p,d,f),A=Vi(e.xy,c,p,d,f),V=Vi(t.xy,c,p,d,f),E=te(R,te(A,V));return{hasIntersectingSegments:Se(F(O,new a(0)),Se(F(T,new a(0)),F(P,new a(0)))),allTriangleVerticesInside:E,triangleContainsRect:w}}function kn(o,e,t,i){const{hasIntersectingSegments:n,allTriangleVerticesInside:s,triangleContainsRect:l}=Gn(o,e,t,i);return x(n,new a(Vn),x(Se(s,l),new a(fe),new a(X)))}function ut(o,e,t,i){const{hasIntersectingSegments:n,allTriangleVerticesInside:s,triangleContainsRect:l}=Gn(o,e,t,i);return x(Se(n,Se(s,l)),new a(fe),new a(X))}function Xe(o){return te(de(o.tlbr.x,new a(0)),de(o.tlbr.y,new a(0)),de(o.tlbr.z,new a(0)),de(o.tlbr.w,new a(0)))}let Dt=class extends Ie{};r([v(3,S)],Dt.prototype,"color",void 0),r([v(4,g)],Dt.prototype,"zoomRange",void 0);let Ue=class extends ue{constructor(){super(...arguments),this.type="FillShader",this.computeAttributes={pos:["nextPos1","nextPos2"]}}vertex(e,t){const i=Nt(this,e.id),n=Mt(this,e.id,e.color).multiply(i),s=this.view.displayViewScreenMat3.multiply(new D(e.pos.xy,1)),l=this.clip(e.id,e.zoomRange);return{glPosition:new S(s.xy,l,1),color:n,...this.maybeRunHittest(e,t,null)}}fragment(e){return this.getFragmentOutput(e.color,e,new a(0))}hittest(e,t){const{pos0:i,pos1:n,pos2:s}=this.computeHittestTriangle(e,t,null),l=Xe(this.hittestRequest);return x(l,()=>{const{tlbr:u}=this.hittestRequest;return ut(i,n,s,u)},()=>{const u=bi(this,e,t);return x(F(u,this.hittestRequest.distance),new a(X),new a(fe))})}};r([M(st)],Ue.prototype,"visualVariableColor",void 0),r([M(lt)],Ue.prototype,"visualVariableOpacity",void 0),r([I(0,C(Dt)),I(1,C(Ce))],Ue.prototype,"vertex",null),r([I(0,C(De))],Ue.prototype,"fragment",null);let ct=class extends Dt{};r([v(5,S)],ct.prototype,"tlbr",void 0),r([v(6,a)],ct.prototype,"width",void 0),r([v(7,a)],ct.prototype,"height",void 0),r([v(8,g)],ct.prototype,"offset",void 0),r([v(9,g)],ct.prototype,"scale",void 0),r([v(10,a)],ct.prototype,"angle",void 0);class ga extends De{}function Yn(o,e,t,i,n){const s=N(K(n,Bo),Ve(1)),l=yi(new S(o,0));return x(s,rn(i.divide(e.x),t.divide(e.y),0,ee(t.divide(e.x)),i.divide(e.y),0,fn(sn(l,0)),fn(sn(0,l)),1),rn(i.divide(e.x),t.divide(e.y),0,ee(t.divide(e.x)),i.divide(e.y),0,0,0,1))}function Wn(o,e){const t=o.view.requiredZoomFactor,i=new g(e.width,e.height),n=i.multiply(e.scale).multiply(t),s=e.angle.multiply(Zi),l=it(s),u=nt(s),c=Yn(e.id,n,l,u,e.bitset),p=o.localTileOffset.getPatternOffsetAtTileOrigin(i,l,u),d=t.multiply(e.scale).multiply(e.offset.subtract(p)).divide(n),f=new D(e.pos,1),h=c.multiply(f).xy.subtract(d),_=e.tlbr.divide(o.mosaicInfo.size.xyxy);let y=K(e.bitset,Rn);return o.visualVariableColor!=null&&(y=x(je(o.getColorValue(e.id)),new a(0),y)),{tileTextureCoord:h,tlbr:_,sampleAlphaOnly:y}}function Un(o,e){const t=Ke(e.tileTextureCoord,new a(1)),i=B(e.tlbr.xy,e.tlbr.zw,t);let n=Y(o.mosaicTexture,i);return n=x(F(e.sampleAlphaOnly,new a(.5)),n.aaaa,n),e.color.multiply(n)}let Ot=class extends Ue{constructor(){super(...arguments),this.type="ComplexFillShader"}vertex(e,t){return{...super.vertex(e,t),...Wn(this,e)}}fragment(e){const t=Un(this,e);return this.getFragmentOutput(t,e,new a(0))}};r([m(Re)],Ot.prototype,"mosaicInfo",void 0),r([H($)],Ot.prototype,"mosaicTexture",void 0),r([m(ht)],Ot.prototype,"localTileOffset",void 0),r([I(0,C(ct)),I(1,C(Ce))],Ot.prototype,"vertex",null),r([I(0,C(ga))],Ot.prototype,"fragment",null);let Li=class extends Hn{constructor(){super(...arguments),this.type="AnimatedFillShader"}vertex(e,t){const{distanceToPx:i,ndc:n,z:s,color:l,isOutline:u,strokeWidth:c,isSDF:p,scale:d,scaleSymbolsProportionally:f}=this._vertexPoly(e),h=this.view.requiredZoomFactor,_=e.sizing.xy,y=_.multiply(h),b=e.angle?e.angle.multiply(Zi):new a(0),w=it(b),O=nt(b),T=Yn(e.id,y,w,O,e.bitset),P=this.localTileOffset.getPatternOffsetAtTileOrigin(_,w,O),R=h.multiply(e.offset.subtract(P)).divide(y),A=new D(e.pos,1),V=T.multiply(A).xy.subtract(R),E=e.tlbr.divide(this.mosaicInfo.size.xyxy);return{glPosition:new S(n,s,1),tlbr:E,uv:V,color:l.multiply(new a(1).subtract(u)),outlineColor:l.multiply(u),distanceToPx:i,strokeWidth:c.multiply(B(new a(1),d,f)),isOutline:u,isSDF:p,...this.maybeRunHittest(e,t,{})}}fragment(e){const t=this._fragmentPoly(e);return this.getFragmentOutput(t,e)}hittest(e,t,i){const{pos0:n,pos1:s,pos2:l}=this.computeHittestTriangle(e,t,null),u=Xe(this.hittestRequest);return x(u,()=>{const{tlbr:c}=this.hittestRequest;return ut(n,s,l,c)},()=>{const c=bi(this,e,t);return x(F(c,this.hittestRequest.distance),new a(X),new a(fe))})}};r([I(0,C(fi)),I(1,C(mi))],Li.prototype,"vertex",null),r([I(0,C(Bn))],Li.prototype,"fragment",null);let Ye=class extends Ie{};r([v(3,S)],Ye.prototype,"color",void 0),r([v(4,g)],Ye.prototype,"offset",void 0),r([v(5,g)],Ye.prototype,"normal",void 0),r([v(6,a)],Ye.prototype,"halfWidth",void 0),r([v(7,a)],Ye.prototype,"referenceHalfWidth",void 0),r([v(8,g)],Ye.prototype,"zoomRange",void 0);let Zn=class extends De{},Kt=class extends k{};function ji(o){return ge(new a(Ho).multiply(W(o,new a(Go))),new a(1))}function Ti(o,e){const{halfWidth:t,normal:i}=o,n=ji(t),s=ot(i).multiply(t);return _e(n.multiply(t.subtract(s)).divide(e.add(n).subtract(new a(1))),new a(0),new a(1))}function _a(o,e){const{id:t,halfWidth:i,referenceHalfWidth:n}=e;if(Mn(o)){const s=new a(2).multiply(n),l=jt(o,t,s),u=new a(ko),c=x(F(i,u),i.divide(ge(n,u)),new a(1));return new a(.5).multiply(c).multiply(l)}return i}function wi(o,e){const{id:t,offset:i,pos:n,normal:s,zoomRange:l}=e,{displayViewScreenMat3:u,displayViewMat3:c}=o.view,p=Mt(o,t,e.color),d=Nt(o,t),f=_a(o,e),h=new a(.5).multiply(o.antialiasingControls.antialiasing),_=ge(f.add(h),new a(.45)).add(new a(.1).multiply(h)),y=ji(_).multiply(_).multiply(i).multiply(o.view.scaleFactor),b=c.multiply(new D(y,new a(0))),w=u.multiply(new D(n,new a(1))).add(b),O=new a(2).multiply(W(f,new a(0))).add(o.clip(t,l)),T=new S(w.xy,O,1);return{color:p,opacity:d,halfWidth:_,normal:s,scaledOffset:y,scaledHalfWidth:f,glPosition:new S(T.xy,O,1)}}function Oi(o,e){const{opacity:t,color:i}=o,n=Ti(o,e);return t.multiply(i).multiply(n)}r([m(a)],Kt.prototype,"antialiasing",void 0),r([m(a)],Kt.prototype,"blur",void 0);class ze extends ue{constructor(){super(...arguments),this.type="LineShader",this.computeAttributes={pos:["nextPos1","nextPos2"]}}vertex(e,t){const i=wi(this,e);return{...i,...this.maybeRunHittest(e,t,i.halfWidth)}}fragment(e){const t=Oi(e,this.antialiasingControls.blur);return this.getFragmentOutput(t,e)}hittest(e,t,i){const{pos0:n,pos1:s,pos2:l}=this.computeHittestTriangle(e,t,null),u=Xe(this.hittestRequest),{distance:c,smallSymbolDistance:p,smallSymbolSizeThreshold:d,tlbr:f}=this.hittestRequest,h=W(i,d.multiply(.5)).multiply(c.subtract(p)),_=this.hittestRequest.position,y=qe(gt(_,n,s),gt(_,n,l)).subtract(i).add(h);return x(u,ut(n,s,l,f),x(F(y,c),new a(X),new a(fe)))}}r([m(Kt)],ze.prototype,"antialiasingControls",void 0),r([M(st)],ze.prototype,"visualVariableColor",void 0),r([M(lt)],ze.prototype,"visualVariableOpacity",void 0),r([M(Et)],ze.prototype,"visualVariableSizeMinMaxValue",void 0),r([M(yt)],ze.prototype,"visualVariableSizeScaleStops",void 0),r([M(xt)],ze.prototype,"visualVariableSizeStops",void 0),r([M(Lt)],ze.prototype,"visualVariableSizeUnitValue",void 0),r([I(0,C(Ye)),I(1,C(Ce))],ze.prototype,"vertex",null),r([I(0,C(Zn))],ze.prototype,"fragment",null);let oi=class extends fi{};r([v(10,a)],oi.prototype,"accumulatedDistance",void 0),r([v(11,g)],oi.prototype,"normal",void 0),r([v(12,g)],oi.prototype,"segmentDirection",void 0);let ha=class extends Bn{};class ai extends Hn{constructor(){super(...arguments),this.type="AnimatedLineShader"}vertex(e,t){const{animationPointerAndBaseSizeAndReferenceSize:i}=e,n=i.xy,{distanceToPx:s,ndc:l,z:u,color:c,isOutline:p,strokeWidth:d,isSDF:f,baseSize:h,scale:_,scaleSymbolsProportionally:y,evalParams:b}=this._vertexPoly(e),w=e.sizing.xy,O=w.x.multiply(h).divide(w.y),T=xe(n,6,b).a.multiply(this.animationInfo.scaleAdjustment),P=e.accumulatedDistance.subtract(T),{normal:R}=e,A=e.normal.y,V=P.divide(this.view.displayZoomFactor).add(_t(e.segmentDirection,e.offset)).divide(O),E=A.add(1).divide(2),L=new g(V,E),z=e.tlbr.divide(this.mosaicInfo.size.xyxy),U=h.divide(2),ae=new a(.5).multiply(this.antialiasingControls.antialiasing),be=ge(U.add(ae),new a(.45)).add(new a(.1).multiply(ae));return{glPosition:new S(l,u,1),tlbr:z,uv:L,color:c.multiply(new a(1).subtract(p)),outlineColor:c.multiply(p),distanceToPx:s,strokeWidth:d.multiply(B(new a(1),_,y)),isOutline:p,isSDF:f,halfWidth:be,normal:R,...this.maybeRunHittest(e,t,be)}}fragment(e){const t=this._fragmentPoly(e),i=Ti(e,this.antialiasingControls.blur),{halfWidth:n,normal:s}=e,l=ji(n),u=ot(s).multiply(n),c=_e(l.multiply(n.subtract(u)).divide(l.subtract(new a(1))),new a(0),new a(1));return this.getFragmentOutput(t.multiply(c).multiply(i),e)}hittest(e,t,i){const{pos0:n,pos1:s,pos2:l}=this.computeHittestTriangle(e,t,null),u=Xe(this.hittestRequest),{distance:c,smallSymbolDistance:p,smallSymbolSizeThreshold:d,tlbr:f}=this.hittestRequest,h=W(i,d.multiply(.5)).multiply(c.subtract(p)),_=this.hittestRequest.position,y=qe(gt(_,n,s),gt(_,n,l)).subtract(i).add(h);return x(u,ut(n,s,l,f),x(F(y,c),new a(X),new a(fe)))}}r([m(Kt)],ai.prototype,"antialiasingControls",void 0),r([I(0,C(oi)),I(1,C(mi))],ai.prototype,"vertex",null),r([I(0,C(ha))],ai.prototype,"fragment",null);let Mi=class extends Qe{};r([v(9,g)],Mi.prototype,"uv",void 0),r([v(10,a)],Mi.prototype,"angle",void 0);let Bt=class extends Jt{};r([v(11,g)],Bt.prototype,"offsetNextVertex1",void 0),r([v(12,g)],Bt.prototype,"offsetNextVertex2",void 0),r([v(13,g)],Bt.prototype,"textureUVNextVertex1",void 0),r([v(14,g)],Bt.prototype,"textureUVNextVertex2",void 0);let ya=class extends $n{};function Me(o,e,t,i){return e.multiply(o.x).add(t.multiply(o.y)).add(i.multiply(o.z))}let vi=class extends ve{constructor(){super(...arguments),this.type="AnimatedMarkerShader",this.computeAttributes={offset:["offsetNextVertex1","offsetNextVertex2"],uv:["textureUVNextVertex1","textureUVNextVertex2"]}}vertex(e,t){const i=e.uv.divide(this.mosaicInfo.size),{position:n,animationPointer:s,evalParams:l,isOutline:u,unscaledDistanceToPx:c,vvScale:p,strokeWidth:d,scaleSymbolsProportionally:f,scale:h,isSDF:_,baseSize:y,clip:b}=this._vertexPreamble(e,e.angle,e.lineLength||new a(0)),w=this._toNdc(n);let O=xe(s,1,l);O=new S(O.rgb.multiply(O.a),O.a);let T=x(rt(e.bitset,ye.bitset.colorLocked),O,xe(s,2,l));T=new S(T.rgb.multiply(T.a),T.a);let P=xe(s,3,l);P=new S(P.rgb.multiply(P.a),P.a);const R=xe(s,4,l).a,A=xe(s,5,l).a,V=Mt(this,e.id,O,Se(rt(e.bitset,ye.bitset.colorLocked),new Vt(u))),E=B(V,T,P),L=Nt(this,e.id),z=B(L,R,A),U=E.multiply(z),ae=this.clip(e.id,e.zoomRange).add(b.multiply(2)),be=c.multiply(p);return{glPosition:new S(w,ae,1),uv:i,color:U.multiply(new a(1).subtract(u)),outlineColor:U.multiply(u),distanceToPx:be,strokeWidth:d.multiply(B(new a(1),h,f)),isOutline:u,isSDF:_,...this.maybeRunHittest(e,t,{pos:e.pos,size:y,sizeCorrection:new a(1),isMapAligned:new a(1),vvRotationMat3:new G(1,0,0,0,1,0,0,0,1),placementMat3:new G(1,0,0,0,1,0,0,0,1),outlineSize:new a(1),distanceToPx:be,isSDF:_})}}fragment(e){let t=this._getColor(e.uv,{color:e.color,distanceToPx:e.distanceToPx,isSDF:e.isSDF,outlineColor:e.outlineColor,outlineSize:e.strokeWidth});return qi.spotlightAnimatedSymbols&&(t=t.add(new S(0,.3,0,.3))),this.getFragmentOutput(t,e)}hittest(e,t,i){const{pos0:n,pos1:s,pos2:l}=this.computeHittestTriangle(e,t,i),u=Xe(this.hittestRequest);return x(u,()=>{const{tlbr:c}=this.hittestRequest;return kn(n,s,l,c)},()=>x(at(i.size,this.hittestRequest.smallSymbolSizeThreshold),this._hittestSmallMarker(e,t,i),this._hittestMarker(e,t,i)))}_hittestSmallMarker(e,t,i){const{position:n,distance:s,smallSymbolDistance:l}=this.hittestRequest,u=s.subtract(l),{viewMat3:c,tileMat3:p}=this.view,d=c.multiply(p).multiply(new D(i.pos,1)).xy,f=i.size.multiply(.5),h=hi(d,n).subtract(f).add(u);return x(F(h,this.hittestRequest.distance),new a(X),new a(fe))}_hittestMarker(e,t,i){const n=this._vertexPreamble({...e},e.angle,new a(0)).position,s=this._vertexPreamble({...e,offset:t.offsetNextVertex1},e.angle,new a(0)).position,l=this._vertexPreamble({...e,offset:t.offsetNextVertex2},e.angle,new a(0)).position,u=this.hittestRequest.position,c=this.hittestRequest.distance,p=Si(u,n,s,l);return x(F(p,c),new a(X),this._hittestSamples(n,s,l,e,t,i))}_hittestSamples(e,t,i,n,s,l){const{outlineSize:u,isSDF:c,distanceToPx:p}=l,d=this.hittestRequest.position,f=this.hittestRequest.distance,h=q(d.add(new g(ee(f),ee(f))),e,t,i),_=q(d.add(new g(0,ee(f))),e,t,i),y=q(d.add(new g(f,ee(f))),e,t,i),b=q(d.add(new g(ee(f),0)),e,t,i),w=q(d,e,t,i),O=q(d.add(new g(f,0)),e,t,i),T=q(d.add(new g(ee(f),f)),e,t,i),P=q(d.add(new g(0,f)),e,t,i),R=q(d.add(new g(f,f)),e,t,i),A=n.uv.divide(this.mosaicInfo.size),V=s.textureUVNextVertex1.divide(this.mosaicInfo.size),E=s.textureUVNextVertex2.divide(this.mosaicInfo.size),L={color:new S(1,1,1,1),outlineSize:u,outlineColor:new S(1,1,1,1),isSDF:c,distanceToPx:p};let z=new a(0);return z=z.add(Z(h).multiply(this._getColor(Me(h,A,V,E),L).a)),z=z.add(Z(_).multiply(this._getColor(Me(_,A,V,E),L).a)),z=z.add(Z(y).multiply(this._getColor(Me(y,A,V,E),L).a)),z=z.add(Z(b).multiply(this._getColor(Me(b,A,V,E),L).a)),z=z.add(Z(w).multiply(this._getColor(Me(w,A,V,E),L).a)),z=z.add(Z(O).multiply(this._getColor(Me(O,A,V,E),L).a)),z=z.add(Z(T).multiply(this._getColor(Me(T,A,V,E),L).a)),z=z.add(Z(P).multiply(this._getColor(Me(P,A,V,E),L).a)),z=z.add(Z(R).multiply(this._getColor(Me(R,A,V,E),L).a)),x(F(z,new a(.05)),new a(fe),new a(X))}};r([I(0,C(Mi)),I(1,C(Bt))],vi.prototype,"vertex",null),r([I(0,C(ya))],vi.prototype,"fragment",null);let oe=class extends Cn{constructor(){super(...arguments),this.symbologyPlane=0,this._input=null}};function bt(o){const e=1/o;return{antialiasing:e,blur:0+e}}let zi=class extends oe{render(e,t){const{context:i,painter:n,pixelRatio:s}=e,{target:l}=t,{freezeGlobalTime:u}=qi,c=0,p=n.textureManager.animationStore.getTexture(i,c),d=[2/e.state.size[0],0,0,0,-2/e.state.size[1],0,-1,1,1],f=Array.from(_o(en(),d)),h=Array.from(ho(en(),f,l.transforms.displayViewScreenMat3)),_=t.instance.getInput(),y=n.textureManager.getMosaicInfo(e,t.textureKey,!1),{optionalAttributes:b}=_,w=b.zoomRange,O=b.value1Position2Value2,T="accumulatedDistance"in b&&b.accumulatedDistance,P="segmentDirection"in b&&b.segmentDirection,R="normal"in b&&b.normal,A=2**(t.target.key.level-e.displayLevel);n.setShader({shader:this.shaders.geometry,uniforms:{...me(e,t.target,_.uniforms),...Q(e,t.target),antialiasingControls:bt(s),mosaicInfo:y,animationInfo:{globalTime:e.animationsEnabled?u===!1?e.time/1e3:u:0,scaleAdjustment:A,animationTextureSize:[p.descriptor.width,p.descriptor.height],toScreen:h,toNdc:d,mapRotation:e.state.rotation,pixelRatio:e.state.pixelRatio},localTileOffset:Xt(t.target)},textures:{...ie(e),mosaicTexture:n.textureManager.getMosaicTexture(e,t.textureKey,!1),animationTexture:{unit:6,texture:p}},defines:{...J(e)},optionalAttributes:{zoomRange:w,value1Position2Value2:O,accumulatedDistance:T,segmentDirection:P,normal:R},useComputeBuffer:j(e)}),n.setPipelineState({...ne(e)}),n.submitDraw(e,t),u===!1&&e.animationsEnabled&&l.requestRender()}},xa=class extends zi{constructor(){super(...arguments),this.type=2,this.symbologyPlane=2,this.shaders={geometry:new vi}}},Sa=class extends zi{constructor(){super(...arguments),this.type=3,this.symbologyPlane=2,this.shaders={geometry:new vi}}},ba=class extends zi{constructor(){super(...arguments),this.type=0,this.symbologyPlane=0,this.shaders={geometry:new Li}}},Ta=class extends zi{constructor(){super(...arguments),this.type=1,this.symbologyPlane=1,this.shaders={geometry:new ai}}},qn=class extends Ft{};r([v(0,g)],qn.prototype,"pos",void 0);class wa extends De{}let jn=class extends k{};r([m(a)],jn.prototype,"dotSize",void 0);let Ni=class extends k{};r([m(a)],Ni.prototype,"pixelRatio",void 0),r([m(a)],Ni.prototype,"tileZoomFactor",void 0);const Oa=1e-6;class dt extends Rt{constructor(){super(...arguments),this.type="DotDensityPointShader"}vertex(e){const t=new G(1,0,0,0,-1,0,0,1,1).multiply(new D(e.pos.xy.divide(he),1)),i=Y(this.drawLocations,t.xy),n=ge(this.instance.dotSize.divide(2),new a(1));let s=new a(0);s=s.add(W(i.a,new a(Oa)).multiply(2));let l=n.add(this.instance.dotSize);const u=this.view.displayViewScreenMat3.multiply(new D(e.pos.add(.5),1)),c=new S(u.xy,s,1),p=this.instance.dotSize.divide(l),d=new a(-1).divide(n.divide(l));return l=l.multiply(this.draw.pixelRatio.multiply(this.draw.tileZoomFactor)),{glPosition:c,glPointSize:l,color:i,ratio:p,invEdgeRatio:d}}fragment(e){const t=ot(e.glPointCoord.subtract(.5)).multiply(2),i=An(new a(0),new a(1),e.invEdgeRatio.multiply(t.subtract(e.ratio)).add(1)),n=new St;return n.fragColor=e.color.multiply(i),n}}r([m(jn)],dt.prototype,"instance",void 0),r([m(Ni)],dt.prototype,"draw",void 0),r([m(re)],dt.prototype,"view",void 0),r([H($)],dt.prototype,"drawLocations",void 0),r([I(0,C(qn))],dt.prototype,"vertex",null),r([I(0,C(wa))],dt.prototype,"fragment",null);let Kn=class extends Ie{};r([v(3,a)],Kn.prototype,"inverseArea",void 0);let ri=class extends k{};r([m(pe.ofType(S,2))],ri.prototype,"isActive",void 0),r([m(pe.ofType(S,8))],ri.prototype,"colors",void 0),r([m(a)],ri.prototype,"dotValue",void 0);let si=class extends k{};r([m(a)],si.prototype,"tileZoomFactor",void 0),r([m(a)],si.prototype,"pixelRatio",void 0),r([m(a)],si.prototype,"tileDotsOverArea",void 0);class $i extends On{}r([H($)],$i.prototype,"dotTexture0",void 0),r([H($)],$i.prototype,"dotTexture1",void 0);let pt=class extends ue{constructor(){super(...arguments),this.type="DotDensityPolygonShader"}_dotThreshold(e,t,i){return e.divide(t).divide(i)}vertex(e){const t=new G(2/he,0,0,0,-2/he,0,-1,1,1).multiply(new D(e.pos,1)),i=this.clip(e.id),n=new S(t.xy,i,1),s=this.getVVData(e.id).multiply(this.instance.isActive.get(0)).multiply(e.inverseArea),l=this.storageTextures.getDataDrivenData0(this.getAttributeDataCoords(e.id)).multiply(this.instance.isActive.get(1)).multiply(e.inverseArea),u=this.draw.tileZoomFactor.multiply(he).divide(this.draw.pixelRatio),c=this._dotThreshold(s,this.instance.dotValue,this.draw.tileDotsOverArea),p=this._dotThreshold(l,this.instance.dotValue,this.draw.tileDotsOverArea),d=e.pos.add(.5).divide(u);return{glPosition:n,color:new S(0,0,0,0),textureCoords:d,thresholds0:c,thresholds1:p}}fragment(e){const t=new St,i=Y(this.drawTextures.dotTexture0,e.textureCoords),n=Y(this.drawTextures.dotTexture1,e.textureCoords),s=e.thresholds0.subtract(i),l=e.thresholds1.subtract(n);let u;const c=pi.fromColumns(this.instance.colors.get(0),this.instance.colors.get(1),this.instance.colors.get(2),this.instance.colors.get(3)),p=pi.fromColumns(this.instance.colors.get(4),this.instance.colors.get(5),this.instance.colors.get(6),this.instance.colors.get(7));if(this.blending){const d=W(new a(0),s),f=W(new a(0),l),h=_t(d,s).add(_t(f,l)),_=W(h,new a(0)),y=new a(1).subtract(_),b=h.add(_),w=s.multiply(d).divide(b),O=l.multiply(f).divide(b),T=c.multiply(w).add(p.multiply(O));u=y.multiply(T)}else{const d=ge(mn(s),mn(l)),f=W(d,new a(0)),h=new a(1).subtract(f),_=W(d,s),y=W(d,l),b=c.multiply(_).add(p.multiply(y));u=h.multiply(b)}return t.fragColor=u,t}hittest(e){return new a(X)}};r([le],pt.prototype,"blending",void 0),r([m(ri)],pt.prototype,"instance",void 0),r([m(si)],pt.prototype,"draw",void 0),r([H($i)],pt.prototype,"drawTextures",void 0),r([I(0,C(Kn))],pt.prototype,"vertex",null),r([I(0,C(De))],pt.prototype,"fragment",null);const za={pos:{count:2,type:yo.UNSIGNED_SHORT}};let Ia=class{constructor(){this._dotTextureSize=0,this._dotTextures=null,this._dotMesh=null}destroy(){this._disposeTextures(),this._dotFBO?.dispose(),this._dotMesh?.destroy()}getFBO(e){if(this._dotFBO==null){const t=he,i=he,n=new ci(t,i);n.samplingMode=9728,n.wrapMode=33071;const s=new ia(e,new Fn(bn.DEPTH24_STENCIL8,t,i));this._dotFBO=new En(e,n,s)}return this._dotFBO}getDotDensityMesh(e){if(this._dotMesh==null){const t=he,i=t*t,n=2,s=new Int16Array(i*n);for(let l=0;l<t;l++)for(let u=0;u<t;u++)s[n*(u+l*t)]=u,s[n*(u+l*t)+1]=l;this._dotMesh=ta.create(e,{primitive:xo.POINTS,vertex:s,count:i,layout:za})}return this._dotMesh}getDotDensityTextures(e,t,i){if(this._dotTextureSize===t&&this._seed===i||(this._disposeTextures(),this._dotTextureSize=t,this._seed=i),this._dotTextures===null){const n=new So(i);this._dotTextures=[this._allocDotDensityTexture(e,t,n),this._allocDotDensityTexture(e,t,n)]}return this._dotTextures}_disposeTextures(){if(this._dotTextures){for(let e=0;e<this._dotTextures.length;e++)this._dotTextures[e].dispose();this._dotTextures=null}}_allocDotDensityTexture(e,t,i){const n=new Float32Array(t*t*4);for(let l=0;l<n.length;l++)n[l]=i.getFloat();const s=new ci(t);return s.dataType=di.FLOAT,s.samplingMode=9728,new Tn(e,s,n)}},Ca=class extends oe{constructor(){super(...arguments),this.type=12,this.shaders={polygon:new pt,point:new dt,fill:new Ue},this._resources=new Map}render(e,t){wn(e)||j(e)?this._renderPolygons(e,t):this._renderDotDensity(e,t)}_renderPolygons(e,t){const{painter:i}=e;i.setShader({shader:this.shaders.fill,uniforms:{...Q(e,t.target),visualVariableColor:null,visualVariableOpacity:null},textures:ie(e),defines:{...J(e)},optionalAttributes:{zoomRange:!1},useComputeBuffer:j(e)}),i.setPipelineState(ne(e)),i.submitDraw(e,t)}_renderDotDensity(e,t){const{context:i,painter:n,requiredLevel:s}=e,l=t.instance.getInput().uniforms,u=this._getOrCreateResourcesRecord(i),c=u.getDotDensityTextures(i,he,l.seed),p=1/2**(s-t.target.key.level),d=he,f=d*window.devicePixelRatio*d*window.devicePixelRatio,h=1/p*(1/p),_=l.dotScale?e.state.scale/l.dotScale:1,y=l.dotValue*_*h;n.setShader({shader:this.shaders.polygon,uniforms:{...Q(e,t.target),instance:{isActive:l.isActive,colors:l.colors,dotValue:Math.max(1,y)},draw:{tileZoomFactor:p,pixelRatio:window.devicePixelRatio,tileDotsOverArea:f/(he*window.devicePixelRatio*he*window.devicePixelRatio)}},textures:{...ie(e),drawTextures:{dotTexture0:{unit:tn,texture:c[0]},dotTexture1:{unit:bo,texture:c[1]}}},defines:{...J(e),blending:l.blending},optionalAttributes:{},useComputeBuffer:!1});const b=i.getViewport();i.setViewport(0,0,he,he);const w=i.boundFramebuffer,O=u.getFBO(i);i.bindFramebuffer(O),i.setClearColor(0,0,0,0),i.clear(16384),n.setPipelineState({color:{write:[!0,!0,!0,!0],blendMode:"composite"},depth:!1,stencil:!1}),n.updatePipelineState(i),n.submitDraw(e,t),i.bindFramebuffer(w),i.setViewport(b.x,b.y,b.width,b.height);const T=u.getFBO(i).colorTexture,P={shader:this.shaders.point,uniforms:{view:To(e,t.target),instance:{dotSize:l.dotSize},draw:{tileZoomFactor:1,pixelRatio:window.devicePixelRatio}},textures:{drawLocations:{unit:tn,texture:T}},defines:{...J(e)},optionalAttributes:{},useComputeBuffer:!1};n.setPipelineState(ne(e)),n.submitDrawMesh(i,P,u.getDotDensityMesh(i),{stencilRef:t.getStencilReference()})}shutdown(e){super.shutdown(e),this._resources.get(e)?.destroy(),this._resources.delete(e)}_getOrCreateResourcesRecord(e){let t=this._resources.get(e);return t==null&&(t=new Ia,this._resources.set(e,t)),t}},Aa=class extends oe{constructor(){super(...arguments),this.type=10,this.shaders={geometry:new Ot}}render(e,t){const{painter:i}=e,n=t.instance.getInput();i.setShader({shader:this.shaders.geometry,uniforms:{...me(e,t.target,n.uniforms),...Q(e,t.target),mosaicInfo:i.textureManager.getMosaicInfo(e,t.textureKey),localTileOffset:Xt(t.target)},textures:{...ie(e),mosaicTexture:i.textureManager.getMosaicTexture(e,t.textureKey)},defines:{...J(e)},optionalAttributes:n.optionalAttributes,useComputeBuffer:j(e)}),i.setPipelineState(ne(e)),i.submitDraw(e,t)}},et=class extends Ie{};r([v(3,g)],et.prototype,"offset",void 0),r([v(4,S)],et.prototype,"color",void 0),r([v(5,g)],et.prototype,"normal",void 0),r([v(6,a)],et.prototype,"halfWidth",void 0),r([v(7,a)],et.prototype,"referenceHalfWidth",void 0),r([v(8,g)],et.prototype,"zoomRange",void 0);let Xn=class extends Zn{};function Ki(o,e,t){const{id:i,bitset:n}=e,s=K(n,Yo),l=F(s,new a(.5)),u=wi(o,e),c=x(l,u.halfWidth,new a(0)),p=Nt(o,i),d=Mt(o,i,e.color),f=x(l,x(rt(n,Wo),d,e.color),d.multiply(p)),h=o.view.displayViewScreenMat3.multiply(new D(e.pos.xy,1)),_=o.clip(e.id),y=new S(h.xy,_,1),b=x(l,u.glPosition,y),w=t&&o.maybeRunHittest(e,t,l);return{isOutline:s,color:f,opacity:new a(1),halfWidth:c,normal:u.normal,glPosition:b,...w}}let Ge=class extends ue{constructor(){super(...arguments),this.computeAttributes={pos:["nextPos1","nextPos2"]}}};r([m(Kt)],Ge.prototype,"antialiasingControls",void 0),r([M(st)],Ge.prototype,"visualVariableColor",void 0),r([M(lt)],Ge.prototype,"visualVariableOpacity",void 0),r([M(Et)],Ge.prototype,"visualVariableSizeMinMaxValue",void 0),r([M(yt)],Ge.prototype,"visualVariableSizeScaleStops",void 0),r([M(xt)],Ge.prototype,"visualVariableSizeStops",void 0),r([M(Lt)],Ge.prototype,"visualVariableSizeUnitValue",void 0);class gi extends Ge{constructor(){super(...arguments),this.type="OutlineFillShader"}vertex(e,t){return Ki(this,e,t)}fragment(e){const{color:t,isOutline:i}=e,n=F(i,new a(.5)),s=Oi(e,this.antialiasingControls.blur),l=x(n,s,t),u=x(n,new a(1/255),new a(0));return this.getFragmentOutput(l,e,u)}hittest(e,t,i){const{pos0:n,pos1:s,pos2:l}=this.computeHittestTriangle(e,t,null),u=Xe(this.hittestRequest);return x(u,()=>{const{tlbr:c}=this.hittestRequest;return ut(n,s,l,c)},()=>{const c=bi(this,e,t);return x(Se(i,F(c,this.hittestRequest.distance)),new a(X),new a(fe))})}}r([I(0,C(et)),I(1,C(Ce))],gi.prototype,"vertex",null),r([I(0,C(Xn))],gi.prototype,"fragment",null);let Bi=class extends Dt{};r([v(5,S)],Bi.prototype,"tlbr",void 0),r([v(6,a)],Bi.prototype,"inverseRasterizationScale",void 0);let Pa=class extends De{};function Va(o){const e=new a(1),t=new a(0);return new G(e.divide(o.x),t.divide(o.y),0,ee(t.divide(o.x)),e.divide(o.y),0,0,0,1)}function Jn(o,e){const t=e.tlbr.xy,i=e.tlbr.zw,n=i.x.subtract(t.x),s=t.y.subtract(i.y),l=new g(n,s).multiply(e.inverseRasterizationScale),u=l.multiply(o.view.requiredZoomFactor),c=Va(u),p=o.localTileOffset.getPatternOffsetAtTileOrigin(l).divide(u),d=new D(e.pos,1);return{tileTextureCoord:c.multiply(d).xy.subtract(p),tlbr:e.tlbr.divide(o.mosaicInfo.size.xyxy)}}function Qn(o,e){const t=Ke(o.tileTextureCoord,new a(1)),i=B(o.tlbr.xy,o.tlbr.zw,t),n=Y(e.mosaicTexture,i);return o.color.multiply(n)}let zt=class extends Ue{constructor(){super(...arguments),this.type="PatternFillShader"}vertex(e,t){return{...super.vertex(e,t),...Jn(this,e)}}fragment(e){const t=Qn(e,this);return this.getFragmentOutput(t,e,new a(0))}};r([m(Re)],zt.prototype,"mosaicInfo",void 0),r([H($)],zt.prototype,"mosaicTexture",void 0),r([m(ht)],zt.prototype,"localTileOffset",void 0),r([I(0,C(Bi)),I(1,C(Ce))],zt.prototype,"vertex",null),r([I(0,C(Pa))],zt.prototype,"fragment",null);let Hi=class extends et{};r([v(9,S)],Hi.prototype,"tlbr",void 0),r([v(10,a)],Hi.prototype,"inverseRasterizationScale",void 0);let eo=class extends Xn{},It=class extends gi{constructor(){super(...arguments),this.type="PatternOutlineFillShader"}vertex(e,t){return{...Ki(this,e,t),...Jn(this,e)}}fragment(e){const{isOutline:t}=e,i=F(t,new a(.5)),n=Oi(e,this.antialiasingControls.blur),s=Qn(e,this),l=x(i,n,s),u=x(i,new a(1/255),new a(0));return this.getFragmentOutput(l,e,u)}};r([m(Re)],It.prototype,"mosaicInfo",void 0),r([H($)],It.prototype,"mosaicTexture",void 0),r([m(ht)],It.prototype,"localTileOffset",void 0),r([I(0,C(Hi)),I(1,C(Ce))],It.prototype,"vertex",null),r([I(0,C(eo))],It.prototype,"fragment",null);const gn=1/Zo;let Be=class extends Ie{};r([v(3,S)],Be.prototype,"color",void 0),r([v(4,S)],Be.prototype,"tlbr",void 0),r([v(5,a)],Be.prototype,"angle",void 0),r([v(6,a)],Be.prototype,"aux1",void 0),r([v(7,a)],Be.prototype,"aux2",void 0),r([v(8,g)],Be.prototype,"aux3",void 0),r([v(9,g)],Be.prototype,"aux4",void 0),r([v(10,g)],Be.prototype,"zoomRange",void 0);class Da extends eo{}let Ct=class extends Ge{constructor(){super(...arguments),this.type="ComplexOutlineFillShader"}vertex(e,t){const{aux1:i,aux2:n,aux3:s,aux4:l}=e,u={...e,width:i,height:n,offset:s,scale:l.multiply(gn)},c={...e,halfWidth:i,referenceHalfWidth:n,offset:s,normal:l.subtract(Uo).multiply(gn)},p=Ki(this,c),d=Wn(this,u),f=F(p.isOutline,new a(.5));return{...p,...d,...Object.assign({},this.maybeRunHittest(e,t,f))}}fragment(e){const{isOutline:t}=e,i=F(t,new a(.5)),n=Oi(e,this.antialiasingControls.blur),s=Un(this,e),l=x(i,n,s),u=x(i,new a(1/255),new a(0));return this.getFragmentOutput(l,e,u)}hittest(e,t,i){const{pos0:n,pos1:s,pos2:l}=this.computeHittestTriangle(e,t,null),u=Xe(this.hittestRequest);return x(u,()=>{const{tlbr:c}=this.hittestRequest;return ut(n,s,l,c)},()=>{const c=bi(this,e,t);return x(Se(i,F(c,this.hittestRequest.distance)),new a(X),new a(fe))})}};r([m(Re)],Ct.prototype,"mosaicInfo",void 0),r([H($)],Ct.prototype,"mosaicTexture",void 0),r([m(ht)],Ct.prototype,"localTileOffset",void 0),r([I(0,C(Be)),I(1,C(Ce))],Ct.prototype,"vertex",null),r([I(0,C(Da))],Ct.prototype,"fragment",null);let Ra=class extends oe{constructor(){super(...arguments),this.type=11,this.shaders={geometry:new Ct}}render(e,t){const{painter:i,pixelRatio:n}=e,s=t.instance.getInput();i.setShader({shader:this.shaders.geometry,uniforms:{...me(e,t.target,s.uniforms),...Q(e,t.target),antialiasingControls:bt(n),mosaicInfo:i.textureManager.getMosaicInfo(e,t.textureKey),localTileOffset:Xt(t.target)},textures:{...ie(e),mosaicTexture:i.textureManager.getMosaicTexture(e,t.textureKey)},defines:{...J(e)},optionalAttributes:s.optionalAttributes,useComputeBuffer:j(e)}),i.setPipelineState(ne(e)),i.submitDraw(e,t)}},Fa=class extends oe{constructor(){super(...arguments),this.type=15,this.shaders={geometry:new Ue}}render(e,t){const{painter:i}=e,n=t.instance.getInput();i.setShader({shader:this.shaders.geometry,uniforms:{...me(e,t.target,n.uniforms),...Q(e,t.target)},textures:ie(e),defines:J(e),optionalAttributes:n.optionalAttributes,useComputeBuffer:j(e)}),i.setPipelineState(ne(e)),i.submitDraw(e,t)}},Ht=class extends Dt{};r([v(5,S)],Ht.prototype,"tlbr",void 0),r([v(6,g)],Ht.prototype,"relativePosition",void 0),r([v(7,a)],Ht.prototype,"gradientMethod",void 0),r([v(8,g)],Ht.prototype,"relativeGradientSize",void 0);let Ea=class extends De{},Gt=class extends Ue{constructor(){super(...arguments),this.type="GradientFillShader"}vertex(e,t){const{tlbr:i,relativePosition:n,gradientMethod:s,relativeGradientSize:l}=e,u=x(rt(e.bitset,un.isAbsolute),this.view.displayZoomFactor,new a(1));return{...super.vertex(e,t),tlbr:i,relativePosition:n,gradientMethod:s,gradientSize:l.multiply(u),isDiscrete:K(e.bitset,un.isDiscrete)}}fragment(e){const{tlbr:t,relativePosition:i,gradientMethod:n,gradientSize:s,isDiscrete:l}=e,u=x(F(l,new a(.5)),s.subtract(1),new g(0)),c=ce([N(n,new a(ln.rectangular)),()=>{const _=ei(i).add(u).divide(s);return ni(ge(_.x,_.y))}],[N(n,new a(ln.circular)),ni(Pn(_t(i,i)).add(u.x).divide(s.x))],[!0,ni(i.x.add(u.x).divide(s.x))]),p=new g(_e(c,new a(0),new a(1)),.5),d=B(t.xy,t.zw,p).divide(this.mosaicInfo.size),f=Y(this.mosaicTexture,d),h=e.color.a;return this.getFragmentOutput(f.multiply(h),e,new a(0))}};r([m(Re)],Gt.prototype,"mosaicInfo",void 0),r([H($)],Gt.prototype,"mosaicTexture",void 0),r([I(0,C(Ht)),I(1,C(Ce))],Gt.prototype,"vertex",null),r([I(0,C(Ea))],Gt.prototype,"fragment",null);let La=class extends oe{constructor(){super(...arguments),this.type=16,this.shaders={geometry:new Gt},this.symbologyPlane=0}render(e,t){const{painter:i}=e,n=t.instance.getInput();i.setShader({shader:this.shaders.geometry,uniforms:{...me(e,t.target,n.uniforms),...Q(e,t.target),mosaicInfo:i.textureManager.getMosaicInfo(e,t.textureKey)},textures:{...ie(e),mosaicTexture:i.textureManager.getMosaicTexture(e,t.textureKey)},defines:{...J(e)},optionalAttributes:n.optionalAttributes,useComputeBuffer:j(e)}),i.setPipelineState(ne(e)),i.submitDraw(e,t)}},Ma=class extends oe{constructor(){super(...arguments),this.type=26,this.shaders={geometry:new gi}}render(e,t){const{painter:i,pixelRatio:n}=e,s=t.instance.getInput();i.setShader({shader:this.shaders.geometry,uniforms:{...me(e,t.target,s.uniforms),...Q(e,t.target),antialiasingControls:bt(n)},textures:ie(e),defines:{...J(e)},optionalAttributes:s.optionalAttributes,useComputeBuffer:j(e)}),i.setPipelineState(ne(e)),i.submitDraw(e,t)}},Na=class extends oe{constructor(){super(...arguments),this.type=28,this.shaders={geometry:new zt}}render(e,t){const{painter:i}=e,n=t.instance.getInput();i.setShader({shader:this.shaders.geometry,uniforms:{...me(e,t.target,n.uniforms),...Q(e,t.target),mosaicInfo:i.textureManager.getMosaicInfo(e,t.textureKey),localTileOffset:Xt(t.target)},textures:{...ie(e),mosaicTexture:i.textureManager.getMosaicTexture(e,t.textureKey)},defines:{...J(e)},optionalAttributes:n.optionalAttributes,useComputeBuffer:j(e)}),i.setPipelineState(ne(e)),i.submitDraw(e,t)}},$a=class extends oe{constructor(){super(...arguments),this.type=29,this.shaders={geometry:new It}}render(e,t){const{painter:i,pixelRatio:n}=e,s=t.instance.getInput();i.setShader({shader:this.shaders.geometry,uniforms:{...me(e,t.target,s.uniforms),...Q(e,t.target),antialiasingControls:bt(n),mosaicInfo:i.textureManager.getMosaicInfo(e,t.textureKey),localTileOffset:Xt(t.target)},textures:{...ie(e),mosaicTexture:i.textureManager.getMosaicTexture(e,t.textureKey)},defines:{...J(e)},optionalAttributes:s.optionalAttributes,useComputeBuffer:j(e)}),i.setPipelineState(ne(e)),i.submitDraw(e,t)}};class Ba{constructor(e,t,i,n){this.startTime=e,this.startValue=t,this.endTime=i,this.endValue=n}getValue(e){if(e<=this.startTime)return this.startValue;if(e>=this.endTime)return this.endValue;const t=(e-this.startTime)/(this.endTime-this.startTime);return this.startValue+t*(this.endValue-this.startValue)}isForeverZero(e){return this.startValue===0&&this.endValue===0||this.endValue===0&&e>=this.endTime}}function to(o,e){return typeof o=="number"?o:o.getValue(e)}function Ha(o){return typeof o=="number"?o:o.endValue}function sl(o,e){return typeof o=="number"?o===0:o.isForeverZero(e)}function Ga(o,e,t,i){return o===t?o:new Ba(o,e,t,i)}function ll(o,e,t){const i=to(o,t),n=i*e;return n===0?0:Ga(t,i,t+n,0)}function ka(o,e){let t=!0;return t=t&&o.collisions===e.collisions,t=t&&o.density===e.density,t=t&&o.interpolate===e.interpolate,t=t&&o.lineCollisionWidth===e.lineCollisionWidth,t=t&&o.lineSpacing===e.lineSpacing,t=t&&o.maxTurnAngle===e.maxTurnAngle,t=t&&o.minSpeedThreshold===e.minSpeedThreshold,t=t&&o.segmentLength===e.segmentLength,t=t&&o.smoothing===e.smoothing,t=t&&o.velocityScale===e.velocityScale,t=t&&o.verticesPerLine===e.verticesPerLine,t=t&&o.onlyForwardTracing===e.onlyForwardTracing,t=t&&o.continuous===e.continuous,t=t&&o.maxNumberOfStreamlines===e.maxNumberOfStreamlines,t=t&&Ya(o.perturb,e.perturb),t}function Ya(o,e){return!o&&!e||!(o&&!e||!o&&e)&&o?.rotation===e?.rotation&&o?.scale===e?.scale}function ul(o){const e=Za(Ua(o)),t=e,i=!0,n=Math.max(e/2,5),s=Math.round(mt(o.maxPathLength)/n)+1,l=10,{density:u}=o,c=mt(o.smoothing),p=o.flowRepresentation==="flow-from"?1:-1,d=.001,f=1,h=!0,_=!1,{continuous:y,perturb:b}=o;return{smoothing:c,interpolate:h,velocityScale:p,verticesPerLine:s,minSpeedThreshold:d,segmentLength:n,maxTurnAngle:f,collisions:i,lineCollisionWidth:t,lineSpacing:l,density:u,onlyForwardTracing:_,continuous:y,perturb:b,wrapAround:!1,maxNumberOfStreamlines:1/0}}function cl(o,e,t,i){if(o.length===0)return[];const n=[],s=t.time-e.time,l=na(o),u=l?oa(o[0].hasMagnitude):1,c=l?({vertices:p},d)=>{const f=p,h=d*u;return{x:f[h],y:f[h+1],time:nn(f[h+2]),speed:0}}:({vertices:p},d)=>p[d];for(const p of o){const{stage:d,vertices:f}=p;if(d===2)continue;const h=f.length/u,_=c(p,0),y=_.time,b=(s*i-y)%(c(p,h-1).time-y)+y;let w=_.x,O=_.y,T=_.time;for(let P=1;P<h&&T<b;P++){const R=c(p,P),A=Math.min(R.time,b)-T,V=R.time-T;w+=(R.x-w)*(A/V),O+=(R.y-O)*(A/V),T=nn(T+A)}n.push(Wa(w,O,e,t))}return n}function Wa(o,e,t,i){return o/=t.size[0],e=1-(e/=t.size[1]),o*=t.extent.xmax-t.extent.xmin,e*=t.extent.ymax-t.extent.ymin,o+=t.extent.xmin,e+=t.extent.ymin,o-=i.extent.xmin,e-=i.extent.ymin,o/=i.extent.xmax-i.extent.xmin,e=1-(e/=i.extent.ymax-i.extent.ymin),{x:o*=i.size[0],y:e*=i.size[1]}}function Ua(o){if(!o.hasVisualVariables("size"))return{kind:"constant",value:[mt(o.trailWidth)]};const e=o.getVisualVariablesForType("size")[0],t=[],i=[];let n;if(e.stops){for(const s of e.stops)t.push(s.value),i.push(mt(s.size));n=e.stops.length}else t.push(e.minDataValue,e.maxDataValue),i.push(mt(e.minSize),mt(e.maxSize)),n=2;return{kind:"ramp",stops:t,values:i,count:n}}function Za(o){return o.kind==="constant"?o.value[0]:o.values[o.values.length-1]}function _n(o){const e=o.toRgba();return[e[0]/255,e[1]/255,e[2]/255,e[3]]}function dl(o){return{kind:"constant",value:[.1,.1,.1,1]}}function pl(o){if(!o.hasVisualVariables("color"))return{kind:"constant",value:_n(o.color)};const e=o.getVisualVariablesForType("color")[0],t=[],i=[];for(const n of e.stops)t.push(n.value),Array.prototype.push.apply(i,_n(n.color));return{kind:"ramp",stops:t,values:i,count:e.stops.length}}function fl(o){if(!o.hasVisualVariables("opacity"))return{kind:"constant",value:[1]};const e=o.getVisualVariablesForType("opacity")[0],t=[],i=[];for(const n of e.stops)t.push(n.value),i.push(n.opacity);return{kind:"ramp",stops:t,values:i,count:e.stops.length}}const Ee=8;function ml(o){if(o.kind==="constant")return{constant:o.value,count:1,stops:new Array(Ee).fill(0),values:new Array(Ee).fill(o.value)};const e=Math.min(o.count,Ee),t=new Array(Ee).fill(o.stops[e-1]),i=new Array(Ee).fill(null).map((n,s)=>{const l=4*Math.min(s,e-1);return o.values.slice(l,l+4)});for(let n=0;n<e;n++)t[n]=o.stops[n];return{constant:[0,0,0,0],count:e,stops:t,values:i}}function vl(o){if(o.kind==="constant")return{constant:o.value[0],count:1,stops:new Array(Ee).fill(0),values:new Array(Ee).fill(o.value[0])};const e=Math.min(o.count,Ee),t=new Array(Ee).fill(o.stops[e-1]),i=new Array(Ee).fill(o.values[e-1]);for(let n=0;n<e;n++)t[n]=o.stops[n],i[n]=o.values[n];return{constant:0,count:e,stops:t,values:i}}function qa(o,e){return o===e||o!=null&&e!=null&&o.equals(e)}function gl(o,e){if(!ka(o.simulationSettings,e.simulationSettings)||!qa(o.timeExtent,e.timeExtent))return!1;let t=!0;return t=t&&o.loadImagery===e.loadImagery,t=t&&o.createFlowMesh===e.createFlowMesh,t=t&&o.color.kind===e.color.kind,t=t&&o.opacity.kind===e.opacity.kind,t=t&&o.size.kind===e.size.kind,t}const ja=36e5,_l=3600;class We extends k{}r([m(a)],We.prototype,"time",void 0),r([m(G)],We.prototype,"dvsMat3",void 0),r([m(G)],We.prototype,"displayViewMat3",void 0),r([m(a)],We.prototype,"displayOpacity",void 0),r([m(a)],We.prototype,"startTime",void 0),r([m(a)],We.prototype,"endTime",void 0);let ke=class extends k{};r([m(a)],ke.prototype,"trailLength",void 0),r([m(a)],ke.prototype,"flowSpeed",void 0),r([m(a)],ke.prototype,"featheringSize",void 0),r([m(a)],ke.prototype,"featheringOffset",void 0),r([m(a)],ke.prototype,"introFade",void 0),r([m(a)],ke.prototype,"fadeToZero",void 0),r([m(a)],ke.prototype,"decayRate",void 0);let Gi=class extends k{};r([m(a)],Gi.prototype,"min",void 0),r([m(a)],Gi.prototype,"max",void 0);let vt=class extends k{getValue(e,t){return t?ce([Le(e,this.stops.first()),this.values.first()],[de(e,this.stops.get(this.count.subtract(1))),this.values.get(this.count.subtract(1))],[!0,()=>{const i=this.stops.findIndex(c=>F(c,e)),n=this.stops.get(i),s=i.subtract(1),l=this.stops.get(s),u=e.subtract(l).divide(n.subtract(l));return B(this.values.get(s),this.values.get(i),u)}]):this.constant}};r([m(S)],vt.prototype,"constant",void 0),r([m(pe.ofType(a,8))],vt.prototype,"stops",void 0),r([m(pe.ofType(S,8))],vt.prototype,"values",void 0),r([m(qt)],vt.prototype,"count",void 0);class Ze extends k{getValue(e,t){return t?ce([Le(e,this.stops.first()),this.values.first()],[de(e,this.stops.get(this.count.subtract(1))),this.values.get(this.count.subtract(1))],[!0,()=>{const i=this.stops.findIndex(c=>F(c,e)),n=this.stops.get(i),s=i.subtract(1),l=this.stops.get(s),u=e.subtract(l).divide(n.subtract(l));return B(this.values.get(s),this.values.get(i),u)}]):this.constant}}function io(o,e,t){return o.add(e.multiply(new a(2)).multiply(t))}function no(o,e,t,i){return o.dvsMat3.multiply(new D(e,1)).add(o.displayViewMat3.multiply(new D(t.multiply(i),0))).xy}function li(o,e,t){const i=B(new a(0),Fi(e.multiply(new a(-1))),t);return Fi(e.multiply(o).multiply(new a(-1))).subtract(i).divide(new a(1).subtract(i))}function oo(o,e,t,i){const n=_e(new a(.5).subtract(i.divide(t)),new a(0),new a(.5)),s=x(F(e,n),new a(1).subtract(e.subtract(n).divide(new a(.5).subtract(n))),new a(1));return o.multiply(s)}function Xi(o,e){return new S(o.rgb.multiply(e),e)}function Ka(o,e){return Ke(o.multiply(3.634).add(e.multiply(5.153)).add(7.381),new a(1))}r([m(a)],Ze.prototype,"constant",void 0),r([m(pe.ofType(a,8))],Ze.prototype,"stops",void 0),r([m(pe.ofType(a,8))],Ze.prototype,"values",void 0),r([m(qt)],Ze.prototype,"count",void 0);let ki=class extends Ft{};r([v(0,g)],ki.prototype,"position",void 0),r([v(1,g)],ki.prototype,"texcoord",void 0);let Xa=class extends Qt{};class Fe extends Rt{constructor(){super(...arguments),this.type="FlowImageryShader",this.vvColor=null,this.vvOpacity=null}vertex(e){const t=this.state.dvsMat3.multiply(new D(e.position,1)).xy;return{glPosition:new S(t,0,1),texcoord:e.texcoord}}fragment(e){const t=Y(this.texture,e.texcoord),i=this.config.min.add(t.r.multiply(this.config.max.subtract(this.config.min))),n=this.color.getValue(i,this.vvColor),s=n.a.multiply(this.opacity.getValue(t.r,this.vvOpacity)).multiply(t.a),l=new St;return l.fragColor=Xi(n,s),l}}r([le],Fe.prototype,"vvColor",void 0),r([le],Fe.prototype,"vvOpacity",void 0),r([m(We)],Fe.prototype,"state",void 0),r([m(Gi)],Fe.prototype,"config",void 0),r([H($)],Fe.prototype,"texture",void 0),r([m(vt)],Fe.prototype,"color",void 0),r([m(Ze)],Fe.prototype,"opacity",void 0),r([I(0,C(ki))],Fe.prototype,"vertex",null),r([I(0,C(Xa))],Fe.prototype,"fragment",null);let kt=class extends Ft{};r([v(0,S)],kt.prototype,"xyts0",void 0),r([v(1,S)],kt.prototype,"xyts1",void 0),r([v(2,S)],kt.prototype,"typeIdFirstTimeLastTime",void 0),r([v(3,S)],kt.prototype,"extrudeInfo",void 0);class Ja extends Qt{}let Ae=class extends Rt{constructor(){super(...arguments),this.type="FlowParticlesShader",this.vvColor=null,this.vvOpacity=null,this.vvSize=null}vertex(e){const t=e.typeIdFirstTimeLastTime.z,i=e.typeIdFirstTimeLastTime.w.subtract(t),n=e.xyts0.xy,s=e.xyts0.z.subtract(t),l=e.xyts0.w,u=e.xyts1.xy,c=e.xyts1.z.subtract(t),p=e.xyts1.w,d=e.typeIdFirstTimeLastTime.x,f=e.typeIdFirstTimeLastTime.y,h=new a(2),_=new a(1),y=new a(2),b=new a(3),w=e.extrudeInfo.xy,O=e.extrudeInfo.zw,T=i.add(this.config.trailLength),P=Ke(this.state.time.multiply(this.config.flowSpeed),T),R=P.subtract(s).divide(c.subtract(s)),A=_e(R,new a(0),new a(1)),V=B(s,c,A),E=B(l,p,A),L=B(w,O,A),z=In(u.subtract(n)).multiply(new a(.5)),U=N(d,h),ae=Se(N(f,_),N(f,y)),be=x(U,Se(at(R,new a(0)),te(F(R,new a(1)),Do(c,i))),at(R,new a(0))),ti=x(U,ce([N(f,_),L],[N(f,y),L.multiply(new a(-1))],[N(f,b),L.add(z)],[!0,L.multiply(new a(-1)).add(z)]),ce([N(f,_),w],[N(f,y),w.multiply(new a(-1))],[N(f,b),L],[!0,L.multiply(new a(-1))])),Ii=x(U,ce([N(f,_),new g(.5,0)],[N(f,y),new g(.5,1)],[N(f,b),new g(1,0)],[!0,new g(1,1)]),ce([N(f,_),new g(.5,0)],[N(f,y),new g(.5,1)],[N(f,b),new g(.5,0)],[!0,new g(.5,1)])),$t=x(U,V,x(ae,s,V)),Ci=x(U,E,x(ae,l,E)),co=x(U,li(P.subtract(V).divide(this.config.trailLength),this.config.decayRate,this.config.fadeToZero),x(ae,li(P.subtract(s).divide(this.config.trailLength),this.config.decayRate,this.config.fadeToZero),li(P.subtract(V).divide(this.config.trailLength),this.config.decayRate,this.config.fadeToZero))),po=new a(1).subtract(Fi($t.multiply(new a(-1)))),Ji=io(this.size.getValue(Ci,this.vvSize),this.config.featheringSize,this.config.featheringOffset),Qi=this.color.getValue(Ci,this.vvColor),fo=Qi.a.multiply(this.opacity.getValue(Ci,this.vvOpacity)).multiply(co).multiply(B(new a(1),po,this.config.introFade)).multiply(this.state.displayOpacity),mo=x(U,B(n,u,A),x(ae,n,B(n,u,A))),vo=no(this.state,mo,ti,Ji);return{glPosition:x(be,new S(0,0,-2,1),new S(vo,0,1)),color:Xi(Qi,fo),texcoord:Ii,size:Ji}}fragment(e){const t=new St;return t.fragColor=oo(e.color,ot(e.texcoord.subtract(new g(.5))),e.size,this.config.featheringSize),t}};r([le],Ae.prototype,"vvColor",void 0),r([le],Ae.prototype,"vvOpacity",void 0),r([le],Ae.prototype,"vvSize",void 0),r([m(We)],Ae.prototype,"state",void 0),r([m(ke)],Ae.prototype,"config",void 0),r([m(vt)],Ae.prototype,"color",void 0),r([m(Ze)],Ae.prototype,"opacity",void 0),r([m(Ze)],Ae.prototype,"size",void 0),r([I(0,C(kt))],Ae.prototype,"vertex",null),r([I(0,C(Ja))],Ae.prototype,"fragment",null);class Yt extends Ft{}r([v(0,D)],Yt.prototype,"positionAndSide",void 0),r([v(1,D)],Yt.prototype,"timeInfo",void 0),r([v(2,g)],Yt.prototype,"extrude",void 0),r([v(3,a)],Yt.prototype,"speed",void 0);let Qa=class extends Qt{};class Pe extends Rt{constructor(){super(...arguments),this.type="FlowStreamlinesShader",this.vvColor=null,this.vvOpacity=null,this.vvSize=null}vertex(e){const t=e.positionAndSide.xy,i=this.color.getValue(e.speed,this.vvColor),n=this.opacity.getValue(e.speed,this.vvOpacity),s=io(this.size.getValue(e.speed,this.vvSize),this.config.featheringSize,this.config.featheringOffset),l=no(this.state,t,e.extrude,s),u=i.a.multiply(n);return{glPosition:new S(l,0,1),side:e.positionAndSide.z,timeInfo:e.timeInfo,color:Xi(i,u),size:s}}fragment(e){const t=e.timeInfo.z.subtract(e.timeInfo.y).add(this.config.trailLength),i=Ka(e.timeInfo.y,e.timeInfo.z),n=Ke(i.multiply(t).add(this.state.time.multiply(this.config.flowSpeed)),t).add(e.timeInfo.y).subtract(e.timeInfo.x).divide(this.config.trailLength),s=e.color.multiply(this.state.displayOpacity).multiply(x(at(n,new a(0)),new a(0),li(n,this.config.decayRate,this.config.fadeToZero))),l=new St;return l.fragColor=oo(s,ei(e.side).divide(new a(2)),e.size,this.config.featheringSize),l}}r([le],Pe.prototype,"vvColor",void 0),r([le],Pe.prototype,"vvOpacity",void 0),r([le],Pe.prototype,"vvSize",void 0),r([m(We)],Pe.prototype,"state",void 0),r([m(ke)],Pe.prototype,"config",void 0),r([m(vt)],Pe.prototype,"color",void 0),r([m(Ze)],Pe.prototype,"opacity",void 0),r([m(Ze)],Pe.prototype,"size",void 0),r([I(0,C(Yt))],Pe.prototype,"vertex",null),r([I(0,C(Qa))],Pe.prototype,"fragment",null);let er=class extends Cn{constructor(){super(...arguments),this.type=14,this.drawPhase=1,this.shaders={imagery:new Fe,particles:new Ae,streamlines:new Pe}}render(e,t){const{painter:i}=e;i.setPipelineState({depth:!1,color:{write:[!0,!0,!0,!0],blendMode:"composite"},stencil:{write:!1,test:{compare:514,op:{fail:7680,zFail:7680,zPass:7680},mask:255}}}),this._renderResource(e,t.item.resources,this._createVisualState(e,t))}_renderResource(e,t,i){switch(t.kind){case"stack":return void this._renderStackResources(e,t,i);case"imagery":return void this._renderImageryResources(e,t,i);case"particles":return void this._renderParticlesResources(e,t,i);case"streamlines":return void this._renderStreamlinesResources(e,t,i)}}_createVisualState(e,t){const{item:i,dvsMat3:n}=t,s=e.time/1e3;return{time:e.animationsEnabled?s:ja,dvsMat3:n,displayViewMat3:e.state.displayViewMat3,displayOpacity:e.animationsEnabled?to(i.displayOpacity,s):Ha(i.displayOpacity),startTime:i.startTime,endTime:i.endTime}}_renderStackResources(e,t,i){for(const n of t.resources)this._renderResource(e,n,i)}_renderImageryResources({context:e,painter:t},i,n){const s=i.getProgramSpec(n);t.submitDrawMeshUntyped(e,{shader:this.shaders.imagery,uniforms:s.uniforms,textures:s.textures,defines:s.defines,optionalAttributes:s.optionalAttributes,useComputeBuffer:!1},i.mesh,{stencilRef:0})}_renderParticlesResources({context:e,painter:t},i,n){const s=i.getProgramSpec(n);t.submitDrawMeshUntyped(e,{shader:this.shaders.particles,uniforms:s.uniforms,textures:s.textures,defines:s.defines,optionalAttributes:s.optionalAttributes,useComputeBuffer:!1},i.mesh,{stencilRef:0})}_renderStreamlinesResources({context:e,painter:t},i,n){const s=i.getProgramSpec(n);t.submitDrawMeshUntyped(e,{shader:this.shaders.streamlines,uniforms:s.uniforms,textures:s.textures,defines:s.defines,optionalAttributes:s.optionalAttributes,useComputeBuffer:!1},i.mesh,{stencilRef:0})}},hn=class{constructor(e,t,i,n){this.dataType=e,this.samplingMode=t,this.pixelFormat=i,this.internalFormat=n}};function tr(o,e){const{textureFloatLinear:t,colorBufferFloat:i}=o.capabilities,n=i?.textureFloat,s=i?.textureHalfFloat,l=i?.floatBlend,u=o.driverTest.floatBufferBlend.result;if(!n&&!s)throw new Ai("heatmap:missing-color-buffer-float","HeatmapRenderer requires the WebGL extension EXT_color_buffer_float or EXT_color_buffer_half_float or WEBGL_color_buffer_float.");if(!(l&&u||s))throw new Ai("heatmap:missing-float-blend","HeatmapRenderer requires the WebGL extension EXT_float_blend or EXT_color_buffer_half_float."+(u?"":" This device claims support for EXT_float_blend, but does not actually support it."));const c=n&&l&&u,p=s,d=t,f=!!i?.R32F,h=!!i?.R16F;if(c&&d)return d||e.warnOnce("Missing WebGL extension OES_texture_float_linear. Heatmap quality may be reduced."),new hn(di.FLOAT,d?9729:9728,f?6403:6408,f?on.R32F:6408);if(p)return new hn(di.HALF_FLOAT,9729,h?6403:6408,h?on.R16F:6408);throw new Ai("heatmap:missing-hardware-support","HeatmapRenderer requires WebGL extensions that allow it to render and blend to float or half float textures.")}const ir=()=>wo.getLogger("esri.views.2d.engine.webgl.shaderGraph.techniques.heatmap.HeatmapResources");let nr=class{destroy(){this._accumulateFramebuffer=an(this._accumulateFramebuffer),this._resolveGradientTexture=an(this._resolveGradientTexture),this._prevGradientHash=null,this._qualityProfile=null}get initialized(){return this._accumulateFramebuffer!=null&&this._resolveGradientTexture!=null}get accumulateFramebuffer(){return this._accumulateFramebuffer}get resolveGradientTexture(){return this._resolveGradientTexture}loadQualityProfile(e){if(this._qualityProfile==null){const t=tr(e,ir());this._qualityProfile={...t,defines:{usesHalfFloatPrecision:t.dataType!==di.FLOAT}}}return this._qualityProfile}ensureAccumulateFBO(e,t,i){if(this._accumulateFramebuffer==null){const{dataType:n,samplingMode:s,pixelFormat:l,internalFormat:u}=this.loadQualityProfile(e),c=new ci(t,i);c.pixelFormat=l,c.internalFormat=u,c.dataType=n,c.samplingMode=s,c.wrapMode=33071;const p=new Fn(bn.DEPTH24_STENCIL8,t,i);this._accumulateFramebuffer=new En(e,c,p)}else{const{width:n,height:s}=this._accumulateFramebuffer;n===t&&s===i||this._accumulateFramebuffer.resize(t,i)}return this._accumulateFramebuffer}ensureResolveGradientTexture(e,t,i){if(this._resolveGradientTexture==null){const n=new ci;n.wrapMode=33071,this._resolveGradientTexture=new Tn(e,n),this._prevGradientHash=null}return this._prevGradientHash!==t&&(this._resolveGradientTexture.resize(i.length/4,1),this._resolveGradientTexture.setData(i),this._prevGradientHash=t),this._resolveGradientTexture}};function ao(o){return o?.25:1}class ro extends Ie{}r([v(5,g)],ro.prototype,"offset",void 0);class or extends De{}let Yi=class extends k{};r([m(a)],Yi.prototype,"radius",void 0),r([m(a)],Yi.prototype,"isFieldActive",void 0);let Wt=class extends ue{constructor(){super(...arguments),this.type="HeatmapAccumulateShader",this.usesHalfFloatPrecision=!1}vertex(e){const{radius:t,isFieldActive:i}=this.kernelControls,n=e.offset,s=i.multiply(this.getVVData(e.id).x).add(new a(1).subtract(i)),l=this.view.displayViewScreenMat3.multiply(new D(e.pos,1)).add(this.view.displayViewMat3.multiply(new D(n,0)).multiply(t)),u=this.clip(e.id);return{glPosition:new S(l.xy,u,1),offset:n,fieldValue:s,color:new S(0),...this.maybeRunHittest(e,{},null)}}fragment(e){const{offset:t,fieldValue:i}=e,n=ot(t),s=W(n,new a(1)),l=new a(1).subtract(n.multiply(n)),u=l.multiply(l),c=s.multiply(u).multiply(i).multiply(new a(ao(this.usesHalfFloatPrecision)));return this.getFragmentOutput(new S(c),e)}hittest(e){const{viewMat3:t,tileMat3:i}=this.view,n=t.multiply(i).multiply(new D(e.pos,1)),s=va(n.xy,this.kernelControls.radius,this.hittestRequest.position);return x(F(s,this.hittestRequest.distance),new a(X),new a(fe))}};r([le],Wt.prototype,"usesHalfFloatPrecision",void 0),r([m(Yi)],Wt.prototype,"kernelControls",void 0),r([I(0,C(ro))],Wt.prototype,"vertex",null),r([I(0,C(or))],Wt.prototype,"fragment",null);let so=class extends Ft{};r([v(0,g)],so.prototype,"position",void 0);let ar=class extends Qt{};class Wi extends k{}r([m(g)],Wi.prototype,"minAndInvRange",void 0),r([m(a)],Wi.prototype,"normalization",void 0);class ft extends Rt{constructor(){super(...arguments),this.type="HeatmapResolveShader",this.usesHalfFloatPrecision=!1}vertex(e){return{glPosition:new S(e.position.multiply(2).subtract(1),1,1),uv:e.position}}fragment(e){const{accumulatedDensity:t}=this;let i=Y(this.densityTexture,e.uv).r.divide(new a(ao(this.usesHalfFloatPrecision)));i=i.multiply(t.normalization),i=i.subtract(t.minAndInvRange.x).multiply(t.minAndInvRange.y);const n=Y(this.gradientTexture,new g(i,.5)),s=new St;return s.fragColor=new S(n.rgb.multiply(n.a),n.a),s}}r([le],ft.prototype,"usesHalfFloatPrecision",void 0),r([m(Wi)],ft.prototype,"accumulatedDensity",void 0),r([H($)],ft.prototype,"densityTexture",void 0),r([H($)],ft.prototype,"gradientTexture",void 0),r([I(0,C(so))],ft.prototype,"vertex",null),r([I(0,C(ar))],ft.prototype,"fragment",null);class rr extends oe{constructor(){super(...arguments),this.type=19,this.drawPhase=73,this.shaders={accumulate:new Wt,resolve:new ft},this._isBound=!1,this._resources=new Map}shutdown(e){super.shutdown(e),this._resources.get(e)?.destroy(),this._resources.delete(e),this._prevFBO=null,this._unbind()}render(e,t){const{context:i,painter:n,state:s}=e,l=t.instance.getInput(),{isFieldActive:u}=l.uniforms,c=this._getOrCreateResourcesRecord(i),p=c.loadQualityProfile(i);j(e)||this._bind(e,c,l),n.setShader({shader:this.shaders.accumulate,uniforms:{...Q(e,t.target),kernelControls:{radius:yn(l,s),isFieldActive:u?1:0}},textures:ie(e),defines:{...J(e),...p.defines},optionalAttributes:{},useComputeBuffer:j(e)});const d=j(e)?ur:lo;n.setPipelineState(d),n.submitDraw(e,t)}getStencilReference(e){return lr(e)}renderResolvePass(e,t){if(j(e))return;const{context:i,painter:n}=e,s=this._resources.get(i);if(this._prevFBO==null||this._prevViewport==null||!s?.initialized)return;const{defines:l}=s.loadQualityProfile(i),{minDensity:u,maxDensity:c,radius:p}=t.getInput().uniforms,d=8,f=9,h=s.accumulateFramebuffer,_=s.resolveGradientTexture,y={shader:this.shaders.resolve,uniforms:{accumulatedDensity:{minAndInvRange:[u,1/(c-u)],normalization:3/(p*p*Math.PI)}},textures:{densityTexture:{unit:d,texture:h.colorTexture},gradientTexture:{unit:f,texture:_}},defines:l,optionalAttributes:{},useComputeBuffer:!1};i.bindFramebuffer(this._prevFBO),i.setViewport(0,0,this._prevViewport.width,this._prevViewport.height),i.bindTexture(h.colorTexture,d),i.bindTexture(_,f),n.setPipelineState(cr),n.submitDrawMesh(i,y,n.quadMesh),this._unbind()}_getOrCreateResourcesRecord(e){let t=this._resources.get(e);return t==null&&(t=new nr,this._resources.set(e,t)),t}_unbind(){this._prevFBO=null,this._prevViewport=null,this._isBound=!1}_bind(e,t,i){const{context:n,state:s,pixelRatio:l}=e,u=n.boundFramebuffer;if(this._isBound||u==null)return;const c=n.getViewport();this._prevFBO=u,this._prevViewport=c;const{gradient:p,gradientHash:d}=i.uniforms;t.ensureResolveGradientTexture(n,d,p);const{width:f,height:h}=c,_=sr(yn(i,s),l),y=f*_,b=h*_,w=t.ensureAccumulateFBO(n,y,b);n.blitFramebuffer(u,w,1024),n.bindFramebuffer(w),n.setViewport(0,0,w.width,w.height),n.setColorMask(!0,!0,!0,!0),n.setClearColor(0,0,0,0),n.clear(16384),this._isBound=!0}}function sr(o,e){const t=e>1.5?.25:.5;return o<1/(2*t)?1:t}function lr(o){return o.key.level+1}const lo={color:{write:[!0,!0,!0,!0],blendMode:"additive"},depth:!1,stencil:{write:!1,test:{compare:518,mask:255,op:{fail:7680,zFail:7680,zPass:7681}}}},ur={...lo,stencil:!1},cr={color:{write:[!0,!0,!0,!0],blendMode:"composite"},depth:!1,stencil:!1};function yn(o,e){const{referenceScale:t,radius:i}=o.uniforms;return i*(t!==0?t/e.scale:1)}const dr=1/Io;let we=class extends Ie{};r([v(3,S)],we.prototype,"color",void 0),r([v(4,g)],we.prototype,"offset",void 0),r([v(5,g)],we.prototype,"textureUV",void 0),r([v(6,S)],we.prototype,"fontAndReferenceSize",void 0),r([v(7,S)],we.prototype,"outlineColor",void 0),r([v(8,S)],we.prototype,"haloColor",void 0),r([v(9,g)],we.prototype,"outlineAndHaloSize",void 0),r([v(10,g)],we.prototype,"zoomRange",void 0),r([v(11,a)],we.prototype,"clipAngle",void 0),r([v(12,S)],we.prototype,"referenceSymbol",void 0),r([v(15,a)],we.prototype,"visibility",void 0);let Ui=class extends Jt{};r([v(13,g)],Ui.prototype,"offsetNextVertex1",void 0),r([v(14,g)],Ui.prototype,"offsetNextVertex2",void 0);let pr=class extends De{},se=class extends ue{constructor(){super(...arguments),this.type="TextShader",this.computeAttributes={offset:["offsetNextVertex1","offsetNextVertex2"]},this.textRenderPassType=0,this.isBackgroundPass=!1,this.isLabel=!1}clipLabel(e,t){const{clipAngle:i,zoomRange:n,visibility:s}=e,l=i.multiply(dr),u=Ke(l.subtract(this.view.rotation),new a(360));let c=new a(0);const p=Oo,d=Ro(this.view.currentZoom.multiply(p)).divide(p),f=n.x,h=n.y,_=new a(1).subtract(W(f,d)).multiply(2),y=new a(te(de(u,new a(90)),at(u,new a(270)))).multiply(2),b=new a(2).multiply(new a(1).subtract(W(d,h)));return c=c.add(t.multiply(_)),c=c.add(t.multiply(y)),c=c.add(b),s&&(c=c.add(s)),c}vertex(e,t){const i=K(e.bitset,qo),n=new a(1).subtract(i);let s=e.fontAndReferenceSize[0];const l=e.fontAndReferenceSize[1],u=e.fontAndReferenceSize[2],c=e.fontAndReferenceSize[3];let p=s.divide(u);const d=this.textRenderPassType===1?e.outlineColor:this.textRenderPassType===2?e.haloColor:this._getVertexColor(e),f=this.view.displayViewScreenMat3.multiply(new D(e.pos,1));let h=e.offset,_=new a(1),y=G.identity(),b=new g(0);if(this.isLabel){if(!e.referenceSymbol)throw new Error("InternalError: Optional attribute 'referenceSymbol' expected for labels");const A=e.referenceSymbol,V=A.xy,E=A.z,L=this._unpackDirection(A.w),z=jt(this,e.id,E).divide(2),U=L.multiply(z.add(zo));b=V.add(U),h=h.add(b)}else _=jt(this,e.id,l).divide(l),s=s.multiply(_),p=p.multiply(_),h=h.multiply(_),y=Nn(this,e.id),h=y.multiply(new D(h,0)).xy;const w=K(e.bitset,pn),O=this._getViewRotationMatrix(w).multiply(new D(h,0)).multiply(this.view.scaleFactor);let T=this.isLabel?this.clipLabel(e,w):this.clip(e.id,e.zoomRange);T=this.isBackgroundPass?T.add(n.multiply(2)):T.add(i.multiply(2));let P=new a(0);if(this.textRenderPassType===1&&(T=T.add(x(N(e.outlineAndHaloSize.x,new a(0)),new a(2),new a(0))),P=new a(e.outlineAndHaloSize.x).divide(p).divide(c)),this.textRenderPassType===2){const A=e.outlineAndHaloSize.x,V=new a(e.outlineAndHaloSize.y);T=T.add(x(N(V,new a(0)),new a(2),new a(0))),P=V.add(A).divide(p).divide(c)}const R=this.isLabel?F(T,new a(1)):new Vt(!1);return{glPosition:new S(f.xy.add(O.xy),T,1),color:d,size:p,textureUV:e.textureUV.divide(this.mosaicInfo.size),antialiasingWidth:new a(.105).multiply(u).divide(s).divide(this.view.pixelRatio),outlineDistanceOffset:P,...this.maybeRunHittest(e,t,{vvSizeAdjustment:_,vvRotation:y,labelOffset:b,labelClipped:R,scaleFactor:this.view.scaleFactor})}}_getViewRotationMatrix(e){const t=this.view.displayViewMat3,i=this.view.displayMat3,n=new a(1).subtract(e);return t.multiply(e).add(i.multiply(n))}_getHittestAlignmentMatrix(e){const t=this.view.viewMat3.multiply(this.view.tileMat3),i=this.view.tileMat3,n=new a(1).subtract(e);return t.multiply(e).add(i.multiply(n))}fragment(e){const t=new a(.25),i=new a(1).subtract(t),n=Y(this.mosaicTexture,e.textureUV).a;let s=i.subtract(e.outlineDistanceOffset);this.highlight&&(s=s.divide(2));const l=e.antialiasingWidth,u=An(s.subtract(l),s.add(l),n);return this.getFragmentOutput(e.color.multiply(u),e)}computeHittestTriangle(e,t,{vvSizeAdjustment:i,vvRotation:n,labelOffset:s,scaleFactor:l}){let u,c,p;this.isLabel?(u=new D(e.offset.multiply(l).add(s),0),c=new D(t.offsetNextVertex1.multiply(l).add(s),0),p=new D(t.offsetNextVertex2.multiply(l).add(s),0)):(u=n.multiply(new D(e.offset.multiply(l).multiply(i),0)),c=n.multiply(new D(t.offsetNextVertex1.multiply(l).multiply(i),0)),p=n.multiply(new D(t.offsetNextVertex2.multiply(l).multiply(i),0)));const{viewMat3:d,tileMat3:f}=this.view,h=d.multiply(f).multiply(new D(e.pos,1)),_=K(e.bitset,pn),y=this._getHittestAlignmentMatrix(_);return{pos0:h.add(y.multiply(u)).xy,pos1:h.add(y.multiply(c)).xy,pos2:h.add(y.multiply(p)).xy}}hittest(e,t,i){const{vvSizeAdjustment:n,vvRotation:s,labelOffset:l,labelClipped:u,scaleFactor:c}=i,p=Xe(this.hittestRequest),{pos0:d,pos1:f,pos2:h}=this.computeHittestTriangle(e,t,{vvSizeAdjustment:n,vvRotation:s,labelOffset:l,scaleFactor:c});return x(p,()=>{const{tlbr:_}=this.hittestRequest;return this.isLabel?x(u,new a(X),ut(d,f,h,_)):ut(d,f,h,_)},()=>{const _=Si(this.hittestRequest.position,d,f,h),y=this.isLabel?u:new Vt(!1);return x(y,new a(X),x(F(_,this.hittestRequest.distance),new a(X),new a(fe)))})}_unpackDirection(e){const t=new qt(e),i=Fo(t,new qt(2)),n=Eo(t,new qt(3));return new g(new a(i).subtract(1),new a(n).subtract(1))}_getVertexColor(e){let t=e.color;if(this.visualVariableColor){const i=this.getColorValue(e.id);t=this.visualVariableColor.getColor(i,e.color,new Vt(!1))}if(this.visualVariableOpacity){const i=this.getOpacityValue(e.id),n=this.visualVariableOpacity.getOpacity(i);t=t.multiply(n)}return t}};r([M(st)],se.prototype,"visualVariableColor",void 0),r([M(lt)],se.prototype,"visualVariableOpacity",void 0),r([M(xi)],se.prototype,"visualVariableRotation",void 0),r([M(Et)],se.prototype,"visualVariableSizeMinMaxValue",void 0),r([M(yt)],se.prototype,"visualVariableSizeScaleStops",void 0),r([M(xt)],se.prototype,"visualVariableSizeStops",void 0),r([M(Lt)],se.prototype,"visualVariableSizeUnitValue",void 0),r([m(Re)],se.prototype,"mosaicInfo",void 0),r([H($)],se.prototype,"mosaicTexture",void 0),r([le],se.prototype,"textRenderPassType",void 0),r([le],se.prototype,"isBackgroundPass",void 0),r([le],se.prototype,"isLabel",void 0),r([I(0,C(we)),I(1,C(Ui))],se.prototype,"vertex",null),r([I(0,C(pr))],se.prototype,"fragment",null);let fr=class extends oe{constructor(){super(...arguments),this.type=20,this.shaders={geometry:new se},this.drawPhase=14,this.symbologyPlane=3}render(e,t){const{painter:i}=e,n=J(e),s={...ne(e),stencil:{write:!1,test:{compare:516,mask:255,op:{fail:7680,zFail:7680,zPass:7680}}}},l=t.instance.getInput(),u={shader:this.shaders.geometry,uniforms:{...me(e,t.target,l.uniforms),...Q(e,t.target),mosaicInfo:i.textureManager.getMosaicInfo(e,t.textureKey)},textures:{...ie(e),mosaicTexture:i.textureManager.getMosaicTexture(e,t.textureKey)},defines:{...n,textRenderPassType:0,isBackgroundPass:!0,isLabel:!0},optionalAttributes:l.optionalAttributes,useComputeBuffer:j(e)};i.setPipelineState(s),i.setShader(u),i.submitDraw(e,t,{stencilRef:255}),i.setShader({...u,defines:{...n,textRenderPassType:2,isBackgroundPass:!1,isLabel:!0}}),i.submitDraw(e,t,{stencilRef:255}),i.setShader({...u,defines:{...n,textRenderPassType:0,isBackgroundPass:!1,isLabel:!0}}),i.submitDraw(e,t,{stencilRef:255})}};function mr(o){return W(new a(0),o).multiply(2).subtract(1)}class At extends Ye{}r([v(9,a)],At.prototype,"accumulatedDistance",void 0),r([v(10,a)],At.prototype,"totalLength",void 0),r([v(11,a)],At.prototype,"gradientSize",void 0),r([v(12,g)],At.prototype,"segmentDirection",void 0),r([v(13,S)],At.prototype,"tlbr",void 0);class uo extends k{}r([m(a)],uo.prototype,"isColorPass",void 0);class Ut extends ze{constructor(){super(...arguments),this.type="GradientStrokeShader"}vertex(e,t){const{totalLength:i,gradientSize:n,segmentDirection:s,tlbr:l}=e,u=wi(this,e),c=K(e.bitset,ii.isAlongLine),p=i.divide(this.view.displayZoomFactor),d=x(rt(e.bitset,ii.isAbsoluteSize),()=>{const _=x(F(c,new a(.5)),p,u.halfWidth);return n.divide(_)},n),f=e.accumulatedDistance.add(_t(s,u.scaledOffset).divide(p)),h=l.divide(this.mosaicInfo.size.xyxy);return{...u,tlbr:h,relativePositionAlongLine:f,relativeGradientSize:d,isAlongLine:K(e.bitset,ii.isAlongLine),isDiscrete:K(e.bitset,ii.isDiscrete),...this.maybeRunHittest(e,t,u.halfWidth)}}fragment(e){const{isAlongLine:t,isDiscrete:i,relativePositionAlongLine:n,relativeGradientSize:s,normal:l,tlbr:u}=e,c=Ti(e,this.antialiasingControls.blur),p=mr(l.y).multiply(qe(ot(l),new a(1))),d=new a(.5).multiply(p).add(new a(.5)),f=x(F(t,new a(.5)),n,d),h=x(F(i,new a(.5)),s.subtract(1),new a(0));let _=f.add(h).divide(s);_=x(F(t,new a(.5)),_,ni(_));const y=B(u.xy,u.zw,new g(_e(_,new a(0),new a(1)),.5)),b=Y(this.mosaicTexture,y),w=e.opacity.multiply(c),O=this.getFragmentOutput(b.multiply(w),e),T=W(new a(.5),this.technique.isColorPass).multiply(tt("gradient-depth-epsilon")),P=W(new a(0),l.y).multiply(new a(tt("gradient-depth-bias")).subtract(T));return O.glFragDepth=_e(ot(l).add(P),new a(0),new a(1)),O}}r([m(Re)],Ut.prototype,"mosaicInfo",void 0),r([H($)],Ut.prototype,"mosaicTexture",void 0),r([m(uo)],Ut.prototype,"technique",void 0),r([I(0,C(At)),I(1,C(Ce))],Ut.prototype,"vertex",null);class vr extends oe{constructor(){super(...arguments),this.type=17,this.shaders={geometry:new Ut},this.symbologyPlane=1}_getShaderOptions(e,t,i){const{painter:n,pixelRatio:s}=e,l=t.instance.getInput();return{shader:this.shaders.geometry,uniforms:{...me(e,t.target,l.uniforms),...Q(e,t.target),antialiasingControls:bt(s),mosaicInfo:n.textureManager.getMosaicInfo(e,t.textureKey),technique:{isColorPass:i}},textures:{...ie(e),mosaicTexture:n.textureManager.getMosaicTexture(e,t.textureKey)},defines:{...J(e)},optionalAttributes:l.optionalAttributes,useComputeBuffer:j(e)}}render(e,t){const{painter:i}=e;if(j(e)||wn(e)){const l=ne(e);return i.setPipelineState(l),i.setShader(this._getShaderOptions(e,t,1)),void i.submitDraw(e,t)}e.context.setClearDepth(1),e.context.clear(256);const n={color:!1,depth:{write:{zNear:0,zFar:1},test:513},stencil:{write:!1,test:{compare:514,mask:255,op:{fail:7680,zFail:7680,zPass:7680}}}};i.setShader(this._getShaderOptions(e,t,0)),i.setPipelineState(n),i.submitDraw(e,t);const s={color:{write:[!0,!0,!0,!0],blendMode:"composite"},depth:{write:!1,test:515},stencil:{write:!1,test:{compare:514,mask:255,op:{fail:7680,zFail:7680,zPass:7680}}}};i.setShader(this._getShaderOptions(e,t,1)),i.setPipelineState(s),i.submitDraw(e,t)}}let gr=class extends oe{constructor(){super(...arguments),this.type=21,this.shaders={geometry:new ze},this.symbologyPlane=1}render(e,t){const{painter:i,pixelRatio:n}=e,s=t.instance.getInput();i.setShader({shader:this.shaders.geometry,uniforms:{...me(e,t.target,s.uniforms),...Q(e,t.target),antialiasingControls:bt(n)},textures:ie(e),defines:{...J(e)},optionalAttributes:s.optionalAttributes,useComputeBuffer:j(e)}),i.setPipelineState(ne(e)),i.submitDraw(e,t)}};class Pt extends Ye{}r([v(9,a)],Pt.prototype,"accumulatedDistance",void 0),r([v(10,g)],Pt.prototype,"segmentDirection",void 0),r([v(11,a)],Pt.prototype,"offsetAlongLine",void 0),r([v(12,a)],Pt.prototype,"capType",void 0),r([v(13,S)],Pt.prototype,"tlbr",void 0);class ui extends ze{constructor(){super(...arguments),this.type="TexturedLineShader"}_getDistanceRatio(e,t){const i=K(e.bitset,jo);return i.multiply(ge(t,new a(.25)).multiply(new a(2))).add(new a(1).subtract(i).multiply(mt(1)))}_getSDFAlpha(e){const{halfWidth:t,normal:i,tlbr:n,patternSize:s,accumulatedDistance:l,offsetAlongLine:u,dashToPx:c,capType:p}=e,d=s.x.divide(aa).multiply(c),f=Ri(l.add(u).divide(d)),h=B(n.xy,n.zw,new g(f,.5)),_=yi(Y(this.mosaicTexture,h)).multiply(2).subtract(1).multiply(ra).multiply(c),y=i.y.multiply(t),b=ce([N(p,new a(1)),_.subtract(t)],[N(p,new a(2)),Pn(Lo(ge(_,new a(0)),new a(2)).add(y.multiply(y))).subtract(t)],[!0,_]),w=_e(new a(.25).subtract(b),new a(0),new a(1));return new S(w)}_getPatternColor(e){const{halfWidth:t,normal:i,color:n,accumulatedDistance:s,patternSize:l,sampleAlphaOnly:u,tlbr:c}=e,p=l.y.multiply(new a(2).multiply(t).divide(l.x)),d=Ri(s.divide(p)),f=new a(.5).multiply(i.y).add(new a(.5)),h=B(c.xy,c.zw,new g(f,d));let _=Y(this.mosaicTexture,h);return this.visualVariableColor!=null&&(_=x(F(u,new a(.5)),new S(n.a),n)),_}vertex(e,t){const{segmentDirection:i,tlbr:n,bitset:s}=e,l=wi(this,e),u=e.accumulatedDistance.divide(this.view.displayZoomFactor).add(_t(i,l.scaledOffset)),c=new g(n.z.subtract(n.x),n.w.subtract(n.y)),p=n.divide(this.mosaicInfo.size.xyxy),d=K(s,Ko),f=K(s,Rn),h=x(F(d,new a(.5)),this._getDistanceRatio(e,l.scaledHalfWidth),new a(1));return{...l,tlbr:p,patternSize:c,accumulatedDistance:u,isSDF:d,sampleAlphaOnly:f,dashToPx:h,offsetAlongLine:e.offsetAlongLine,capType:e.capType,...this.maybeRunHittest(e,t,l.halfWidth)}}fragment(e){const{color:t,opacity:i,isSDF:n}=e,s=Ti(e,this.antialiasingControls.blur),l=x(F(n,new a(.5)),this._getSDFAlpha(e),this._getPatternColor(e)),u=t.multiply(i).multiply(s).multiply(l);return this.getFragmentOutput(u,e)}}r([m(Re)],ui.prototype,"mosaicInfo",void 0),r([H($)],ui.prototype,"mosaicTexture",void 0),r([I(0,C(Pt)),I(1,C(Ce))],ui.prototype,"vertex",null);class _r extends oe{constructor(){super(...arguments),this.type=33,this.shaders={geometry:new ui},this.symbologyPlane=1}render(e,t){const{painter:i,pixelRatio:n}=e,s=t.instance.getInput();i.setShader({shader:this.shaders.geometry,uniforms:{...me(e,t.target,s.uniforms),...Q(e,t.target),antialiasingControls:bt(n),mosaicInfo:i.textureManager.getMosaicInfo(e,t.textureKey)},textures:{...ie(e),mosaicTexture:i.textureManager.getMosaicTexture(e,t.textureKey)},defines:{...J(e)},optionalAttributes:s.optionalAttributes,useComputeBuffer:j(e)}),i.setPipelineState(ne(e)),i.submitDraw(e,t)}}class He extends Ie{}r([v(3,S)],He.prototype,"color",void 0),r([v(4,S)],He.prototype,"outlineColor",void 0),r([v(5,g)],He.prototype,"offset",void 0),r([v(6,g)],He.prototype,"textureUV",void 0),r([v(7,S)],He.prototype,"sizing",void 0),r([v(8,a)],He.prototype,"placementAngle",void 0),r([v(9,a)],He.prototype,"sdfDecodeCoeff",void 0),r([v(10,g)],He.prototype,"zoomRange",void 0);class Zt extends Jt{}r([v(11,g)],Zt.prototype,"offsetNextVertex1",void 0),r([v(12,g)],Zt.prototype,"offsetNextVertex2",void 0),r([v(13,g)],Zt.prototype,"textureUVNextVertex1",void 0),r([v(14,g)],Zt.prototype,"textureUVNextVertex2",void 0);class hr extends De{}function Ne(o,e,t,i){return e.multiply(o.x).add(t.multiply(o.y)).add(i.multiply(o.z))}function Di(o){return o.multiply(o).divide(128)}class Oe extends ue{constructor(){super(...arguments),this.type="MarkerShader",this.computeAttributes={offset:["offsetNextVertex1","offsetNextVertex2"],textureUV:["textureUVNextVertex1","textureUVNextVertex2"]}}vertex(e,t){const i=Di(e.sizing.x),n=Di(e.sizing.y),s=Di(e.sizing.z),l=e.placementAngle,u=K(e.bitset,ye.bitset.isSDF),c=K(e.bitset,ye.bitset.isMapAligned),p=K(e.bitset,ye.bitset.scaleSymbolsProportionally),d=rt(e.bitset,ye.bitset.colorLocked),f=Nt(this,e.id),h=Mt(this,e.id,e.color,d).multiply(f),_=this.view.displayViewScreenMat3.multiply(new D(e.pos.xy,1)),y=jt(this,e.id,s).divide(s),b=i.multiply(y),w=e.offset.xy.multiply(y);let O=n.multiply(p.multiply(y.subtract(1)).add(1));O=qe(O,ge(b.subtract(.99),new a(0)));const T=ge(O,new a(1)),P=qe(O,new a(1)),R=G.fromRotation(l.multiply(Zi)),A=Nn(this,e.id),V=this._getViewRotationMatrix(c).multiply(A).multiply(R).multiply(new D(w.xy,0)).multiply(this.view.scaleFactor),E=this.clip(e.id,e.zoomRange),L=new S(_.xy.add(V.xy),E,1),z=e.textureUV.divide(this.mosaicInfo.size),U=e.outlineColor.multiply(P),ae=K(e.bitset,ye.bitset.overrideOutlineColor),be=e.sdfDecodeCoeff.multiply(b);return{glPosition:L,color:h,textureUV:z,outlineColor:U,outlineSize:T,distanceToPx:be,isSDF:u,overrideOutlineColor:ae,...this.maybeRunHittest(e,t,{pos:e.pos,size:b,sizeCorrection:y,scaleFactor:this.view.scaleFactor,isMapAligned:c,vvRotationMat3:A,placementMat3:R,outlineSize:T,distanceToPx:be,isSDF:u})}}fragment(e){const t=this._getColor(e.textureUV,e);return this.getFragmentOutput(t,e)}hittest(e,t,i){const{pos0:n,pos1:s,pos2:l}=this.computeHittestTriangle(e,t,i),u=Xe(this.hittestRequest);return x(u,()=>{const{tlbr:c}=this.hittestRequest;return kn(n,s,l,c)},()=>x(at(i.size,this.hittestRequest.smallSymbolSizeThreshold),this._hittestSmallMarker(e,t,i),this._hittestMarker(e,t,i)))}_getViewRotationMatrix(e){const t=this.view.displayViewMat3,i=this.view.displayMat3,n=new a(1).subtract(e);return t.multiply(e).add(i.multiply(n))}_getViewScreenMatrix(e){const t=this.view.viewMat3.multiply(this.view.tileMat3),i=this.view.tileMat3,n=new a(1).subtract(e);return t.multiply(e).add(i.multiply(n))}_getColor(e,t){return x(N(t.isSDF,new a(1)),this._getSDFColor(e,t),this._getSpriteColor(e,t))}_getSpriteColor(e,t){return Y(this.mosaicTexture,e).multiply(t.color)}_getSDFColor(e,t){const i=Y(this.mosaicTexture,e),n=new a(.5).subtract(yi(i)).multiply(t.distanceToPx).multiply(Dn),s=_e(new a(.5).subtract(n),new a(0),new a(1)),l=t.color.multiply(s);let u=t.outlineSize;this.highlight&&(u=ge(u,t.overrideOutlineColor.multiply(4)));const c=u.multiply(.5),p=ei(n).subtract(c),d=_e(new a(.5).subtract(p),new a(0),new a(1)),f=B(t.outlineColor,t.color,t.overrideOutlineColor).multiply(d);return new a(1).subtract(f.a).multiply(l).add(f)}_hittestSmallMarker(e,t,i){const{position:n,distance:s,smallSymbolDistance:l}=this.hittestRequest,u=s.subtract(l),{viewMat3:c,tileMat3:p}=this.view,d=c.multiply(p).multiply(new D(i.pos,1)).xy,f=i.size.multiply(.5),h=hi(d,n).subtract(f).add(u);return x(F(h,this.hittestRequest.distance),new a(X),new a(fe))}_hittestMarker(e,t,i){const{pos0:n,pos1:s,pos2:l}=this.computeHittestTriangle(e,t,i),u=this.hittestRequest.position,c=this.hittestRequest.distance,p=Si(u,n,s,l);return x(F(p,c),new a(X),this._hittestSamples(n,s,l,e,t,i))}computeHittestTriangle(e,t,i){const{pos:n,sizeCorrection:s,scaleFactor:l,isMapAligned:u}=i,c=new D(e.offset.multiply(s).multiply(l),0),p=new D(t.offsetNextVertex1.multiply(s).multiply(l),0),d=new D(t.offsetNextVertex2.multiply(s).multiply(l),0),{viewMat3:f,tileMat3:h}=this.view,_=f.multiply(h).multiply(new D(n,1)),y=this._getViewScreenMatrix(u).multiply(i.vvRotationMat3).multiply(i.placementMat3);return{pos0:_.add(y.multiply(c)).xy,pos1:_.add(y.multiply(p)).xy,pos2:_.add(y.multiply(d)).xy}}_hittestSamples(e,t,i,n,s,l){const{outlineSize:u,isSDF:c,distanceToPx:p}=l,d=this.hittestRequest.position,f=this.hittestRequest.distance,h=q(d.add(new g(ee(f),ee(f))),e,t,i),_=q(d.add(new g(0,ee(f))),e,t,i),y=q(d.add(new g(f,ee(f))),e,t,i),b=q(d.add(new g(ee(f),0)),e,t,i),w=q(d,e,t,i),O=q(d.add(new g(f,0)),e,t,i),T=q(d.add(new g(ee(f),f)),e,t,i),P=q(d.add(new g(0,f)),e,t,i),R=q(d.add(new g(f,f)),e,t,i),A=n.textureUV.divide(this.mosaicInfo.size),V=s.textureUVNextVertex1.divide(this.mosaicInfo.size),E=s.textureUVNextVertex2.divide(this.mosaicInfo.size),L={color:new S(1),outlineColor:new S(1),overrideOutlineColor:new a(1),outlineSize:u,distanceToPx:p,isSDF:c};let z=new a(0);return z=z.add(Z(h).multiply(this._getColor(Ne(h,A,V,E),L).a)),z=z.add(Z(_).multiply(this._getColor(Ne(_,A,V,E),L).a)),z=z.add(Z(y).multiply(this._getColor(Ne(y,A,V,E),L).a)),z=z.add(Z(b).multiply(this._getColor(Ne(b,A,V,E),L).a)),z=z.add(Z(w).multiply(this._getColor(Ne(w,A,V,E),L).a)),z=z.add(Z(O).multiply(this._getColor(Ne(O,A,V,E),L).a)),z=z.add(Z(T).multiply(this._getColor(Ne(T,A,V,E),L).a)),z=z.add(Z(P).multiply(this._getColor(Ne(P,A,V,E),L).a)),z=z.add(Z(R).multiply(this._getColor(Ne(R,A,V,E),L).a)),x(F(z,new a(.05)),new a(fe),new a(X))}}r([M(st)],Oe.prototype,"visualVariableColor",void 0),r([M(lt)],Oe.prototype,"visualVariableOpacity",void 0),r([M(xi)],Oe.prototype,"visualVariableRotation",void 0),r([M(Et)],Oe.prototype,"visualVariableSizeMinMaxValue",void 0),r([M(yt)],Oe.prototype,"visualVariableSizeScaleStops",void 0),r([M(xt)],Oe.prototype,"visualVariableSizeStops",void 0),r([M(Lt)],Oe.prototype,"visualVariableSizeUnitValue",void 0),r([m(Re)],Oe.prototype,"mosaicInfo",void 0),r([H($)],Oe.prototype,"mosaicTexture",void 0),r([I(0,C(He)),I(1,C(Zt))],Oe.prototype,"vertex",null),r([I(0,C(hr))],Oe.prototype,"fragment",null);let yr=class extends oe{constructor(){super(...arguments),this.type=23,this.shaders={geometry:new Oe},this.symbologyPlane=2}render(e,t){const{painter:i}=e,n=t.instance.getInput();i.setShader({shader:this.shaders.geometry,uniforms:{...me(e,t.target,n.uniforms),...Q(e,t.target),mosaicInfo:i.textureManager.getMosaicInfo(e,t.textureKey,!0)},textures:{...ie(e),mosaicTexture:i.textureManager.getMosaicTexture(e,t.textureKey,!0)},defines:{...J(e)},optionalAttributes:n.optionalAttributes,useComputeBuffer:j(e)}),i.setPipelineState(ne(e)),i.submitDraw(e,t)}};class xr{constructor(){this.computeAttributes={}}get locationsMap(){const e=new Map;for(const t in this.locations)e.set(t,this.locations[t].index);return e}get optionPropertyKeys(){if(!this._optionPropertyKeys){const e=new Set(Object.keys(this.options));this._optionPropertyKeys=e}return this._optionPropertyKeys}get _transformFeedbackBindings(){return[]}get locationInfo(){if(!this._locationInfo){const e=this.locationsMap,t=Array.from(e.entries()).map(([i,n])=>`${i}.${n}`).join(".");this._locationInfo={stringHash:t,locations:e,computeAttributeMap:this.computeAttributes}}return this._locationInfo}get renamedLocationsMap(){const e=new Map;for(const[t,i]of this.locationsMap.entries())e.set("a_"+t,i);return e}getShaderKey(e,t,i,n,s){return`${Object.keys(e).map(l=>`${l}.${e[l]}`).join(".")}.${Object.keys(n).filter(l=>n[l]).map(l=>`${l}_${n[l].toString()}`).join(".")}.${Object.keys(t).filter(l=>this.optionPropertyKeys.has(l)).join(".")}.${Object.keys(i).filter(l=>i[l]).join(".")}`}getProgram(e,t,i,n){let s="",l="";for(const u in i)if(i[u]){const c=typeof i[u]=="boolean"?`#define ${u}
`:`#define ${u} ${i[u]}
`;s+=c,l+=c}return s+=this.vertexShader,l+=this.fragmentShader,new Mo("glslShaderModule",s,l,this.renamedLocationsMap,this._getUniformBindings(t),this._getTextureBindings(),this._transformFeedbackBindings)}_getUniformBindings(e){const t=[];for(const i in this.required){const n=this.required[i];t.push({uniformHydrated:null,shaderModulePath:i,uniformName:i,uniformType:n.type,uniformArrayElementType:xn(n),uniformArrayLength:Sn(n)})}for(const i in e){const n=this.options[i];if(e[i])for(const s in n){const l=n[s];t.push({uniformHydrated:null,shaderModulePath:`${i}.${s}`,uniformName:s,uniformType:l.type,uniformArrayElementType:xn(l),uniformArrayLength:Sn(l)})}}return t}_getTextureBindings(){const e=[];for(const t in this.textures)e.push({textureHydrated:null,shaderModulePath:t,textureName:t});return e}}const xn=o=>o.type==="array"?o.elementType?.type:void 0,Sn=o=>o.type==="array"?o.size:void 0,Sr={hittestDist:a,hittestPos:g},br={size:a},Tr={filterFlags:$,animation:$,visualVariableData:$,dataDriven0:$,dataDriven1:$,dataDriven2:$,gpgpu:$},wr={displayViewScreenMat3:G,displayViewMat3:G,displayMat3:G,viewMat3:G,tileMat3:G,displayZoomFactor:a,requiredZoomFactor:a,tileOffset:g,currentScale:a,currentZoom:a,metersPerSRUnit:a};class Or extends xr{constructor(){super(...arguments),this.vertexShader=vn("materials/pie/pie.vert"),this.fragmentShader=vn("materials/pie/pie.frag"),this.required={...wr,...br,outlineWidth:a,colors:pe,defaultColor:S,othersColor:S,outlineColor:S,donutRatio:a,sectorThreshold:a},this.textures=Tr,this.options={hittestUniforms:Sr,visualVariableSizeMinMaxValue:{minMaxValueAndSize:S},visualVariableSizeScaleStops:{sizes:{type:"array",elementType:a,size:8},values:{type:"array",elementType:a,size:8}},visualVariableSizeStops:{sizes:{type:"array",elementType:a,size:8},values:{type:"array",elementType:a,size:8}},visualVariableSizeUnitValue:{unitValueToPixelsRatio:a},visualVariableOpacity:{opacities:{type:"array",elementType:a,size:8},opacityValues:{type:"array",elementType:a,size:8}},highlightUniforms:{highlightAll:a,activeReasons:a}},this.locations={pos:{index:0,type:g},id:{index:1,type:D},bitset:{index:2,type:a},offset:{index:3,type:g},texCoords:{index:4,type:g},referenceSize:{index:5,type:a},zoomRange:{index:6,type:g}},this.defines={VV_SIZE_MIN_MAX_VALUE:"boolean",VV_SIZE_SCALE_STOPS:"boolean",VV_SIZE_FIELD_STOPS:"boolean",VV_SIZE_UNIT_VALUE:"boolean",VV_OPACITY:"boolean",HITTEST:"boolean",numberOfFields:"number",highlight:"boolean",inside:"boolean",outside:"boolean"}}setNumberOfFields(e){this.required.colors={type:"array",elementType:S,size:e}}}class zr extends oe{constructor(){super(...arguments),this.type=30,this.shaders={geometry:new Or},this.symbologyPlane=2}render(e,t){const{painter:i}=e,{instance:n,target:s}=t,l=this.shaders.geometry,u=n.getInput(),c=u.uniforms.numberOfFields,p=j(e),d=Q(e,s),f=J(e);l.setNumberOfFields(c),i.setShader({shader:l,uniforms:{...me(e,t.target,u.uniforms.shader),...d.storage,...d.view,...d.highlight,highlightUniforms:d.highlight,hittestUniforms:d.hittestRequest?{hittestDist:d.hittestRequest?.distance,hittestPos:d.hittestRequest?.position}:null},textures:Co(e),defines:{VV_SIZE_MIN_MAX_VALUE:!!u.uniforms.shader.visualVariableSizeMinMaxValue,VV_SIZE_SCALE_STOPS:!!u.uniforms.shader.visualVariableSizeScaleStops,VV_SIZE_FIELD_STOPS:!!u.uniforms.shader.visualVariableSizeStops,VV_SIZE_UNIT_VALUE:!!u.uniforms.shader.visualVariableSizeUnitValue,VV_OPACITY:!!u.uniforms.shader.visualVariableOpacity,HITTEST:p,highlight:d.highlight?1:0,...f,numberOfFields:c},optionalAttributes:{},useComputeBuffer:p}),i.setPipelineState(ne(e)),i.submitDraw(e,t)}}class Ir extends oe{constructor(){super(...arguments),this.type=32,this.shaders={geometry:new se},this.symbologyPlane=3}render(e,t){const{painter:i}=e,n=J(e),s=t.instance.getInput(),l={shader:this.shaders.geometry,uniforms:{...me(e,t.target,s.uniforms),...Q(e,t.target),mosaicInfo:i.textureManager.getMosaicInfo(e,t.textureKey)},textures:{...ie(e),mosaicTexture:i.textureManager.getMosaicTexture(e,t.textureKey)},defines:{...n,isBackgroundPass:!0,isLabel:!1,textRenderPassType:0},optionalAttributes:s.optionalAttributes,useComputeBuffer:j(e)};i.setShader(l),i.setPipelineState(ne(e)),i.submitDraw(e,t),i.setShader({...l,defines:{...n,isBackgroundPass:!1,isLabel:!1,textRenderPassType:2}}),i.submitDraw(e,t),i.setShader({...l,defines:{...n,isBackgroundPass:!1,isLabel:!1,textRenderPassType:1}}),i.submitDraw(e,t),i.setShader({...l,defines:{...n,isBackgroundPass:!1,isLabel:!1,textRenderPassType:0}}),i.submitDraw(e,t)}}const _i={fill:new Fa,patternFill:new Na,complexFill:new Aa,gradientFill:new La,outlineFill:new Ma,patternOutlineFill:new $a,complexOutlineFill:new Ra,marker:new yr,pieChart:new zr,line:new gr,texturedLine:new _r,gradientStroke:new vr,text:new Ir,label:new fr,heatmap:new rr,dotDensity:new Ca,flow:new er,animatedMarker:new xa,animatedMarkerShift:new Sa,animatedFill:new ba,animatedLine:new Ta};function Bl(){for(const o in _i)_i[o].startup()}function Hl(o){for(const e in _i)_i[e].shutdown(o)}export{Hl as C,Pe as F,Fe as O,cl as a,ul as b,qa as c,sl as d,fl as e,gl as f,Ha as g,ll as h,vl as i,Ga as j,Ae as k,Bl as l,Ua as m,vn as n,dl as o,ja as p,ml as r,pl as s,qi as t,Za as u,_l as v,_i as x};
