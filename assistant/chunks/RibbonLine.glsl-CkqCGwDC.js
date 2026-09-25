import{fw as Ne,j5 as At,bn as xt,n as _,bj as Et,dl as Wt,bm as Vt,qM as It,oc as Mt,br as Te,iP as yt,d7 as he,ky as jt,hi as Nt,_ as kt,iv as Ze,G as T,J as Jt,e0 as Ce,q as Ut,rX as Bt,f9 as ee,f6 as se,bs as Oe,f7 as _e,f8 as Qe,bH as oe,fa as Ke,hm as He,ww as Ht,fb as Gt,gA as re,bv as et,p0 as qt,wO as le,jg as Xt,ez as Yt,cy as Zt}from"./embed-C3boqIWz.js";import{f as Qt}from"./computeTranslationToOriginAndRotation-D02K6pBD.js";import{t as Kt,a as ei,b as Se,d as ti,x as ii}from"./WebGLLayer-Dl52p3mj.js";import{t as ai}from"./Attribute-DGhdp5lO.js";import{K as Y,D as bt,ag as ni,a8 as pe,ah as tt,u as ri,L as Ge,N as qe,O as si,e as ke,d as oi,f as li,aa as ci,E as di,h as pi,b as fi,c as hi,P as ui,g as Dt,i as mi,t as vi,z as it,j as gi,r as at,ai as xe,l as Si,n as xi,o as yi,aj as bi,ak as nt,al as Di,am as zi,an as rt,p as Ti,s as Pi,ao as wi,y as Re,v as Li,ap as st,w as $i,x as ot,aq as Ci,A as Oi,B as _i,ar as lt,m as Ri}from"./OutputColorHighlightOLID.glsl-B8Shgw7l.js";import{U as Fi,j as Ai}from"./BufferView-BmafMbj8.js";import{h as Fe,l as Ei,x as Wi,j as Vi,v as zt}from"./lineSegment-C7F7IZfp.js";import{k as ye,X as Z,y as ct,v as Pe}from"./plane-CFujGAPR.js";import{Q as Ii,t as Mi}from"./InterleavedLayout-BKCDsYSz.js";import{O as be,g as Ae,a as dt}from"./renderState-DLJht9Cj.js";import{t as s,n as A,i as w}from"./oitResolution.glsl-C445IjL2.js";import{s as ji,t as Ni,n as ki,c as Ji,f as Ui,e as Bi}from"./MixExternalColor.glsl-CSDnENN3.js";import{s as Hi}from"./ShaderBuilder-BF1hpF-R.js";function en(t,e,a,i,n,r,l,d,o,c,p){const m=ea[p.mode];let v,f,h=0;if(Ne(t,e,a,i,o.spatialReference,n,d))return m?.requiresAlignment(p)?(h=m.applyElevationAlignmentBuffer(i,n,r,l,d,o,c,p),v=r,f=l):(v=i,f=n),Ne(v,o.spatialReference,f,r,c.spatialReference,l,d)?h:void 0}function Tt(t,e,a,i,n){const r=(Kt(t)?t.z:ei(t)?t.array[t.offset+2]:t[2])||0;switch(a.mode){case"on-the-ground":{const l=Se(e,t,"ground")??0;return n.verticalDistanceToGround=0,n.sampledElevation=l,void(n.z=l)}case"relative-to-ground":{const l=Se(e,t,"ground")??0,d=a.geometryZWithOffset(r,i);return n.verticalDistanceToGround=d,n.sampledElevation=l,void(n.z=d+l)}case"relative-to-scene":{const l=Se(e,t,"scene")??0,d=a.geometryZWithOffset(r,i);return n.verticalDistanceToGround=d,n.sampledElevation=l,void(n.z=d+l)}case"absolute-height":{const l=a.geometryZWithOffset(r,i),d=Se(e,t,"ground")??0;return n.verticalDistanceToGround=l-d,n.sampledElevation=d,void(n.z=l)}default:return void(n.z=0)}}function tn(t,e,a,i){return Tt(t,e,a,i,ce),ce.z}function an(t,e,a){return e==="on-the-ground"&&a==="on-the-ground"?t.staysOnTheGround:e===a||e!=="on-the-ground"&&a!=="on-the-ground"?e==null||a==null?t.definedChanged:1:t.onTheGroundChanged}function nn(t){return t==="relative-to-ground"||t==="relative-to-scene"}function rn(t){return t!=="absolute-height"}function sn(t,e,a,i,n){Tt(e,a,n,i,ce),Gi(t,ce.verticalDistanceToGround);const r=ce.sampledElevation,l=At(ta,t.transformation);return De[0]=e.x,De[1]=e.y,De[2]=ce.z,Qt(e.spatialReference,De,l,i.spatialReference)?t.transformation=l:console.warn("Could not locate symbol object properly, it might be misplaced"),r}function Gi(t,e){for(let a=0;a<t.geometries.length;++a){const i=t.geometries[a].getMutableAttribute("groundDistance");i&&i.data[0]!==e&&(i.data[0]=e,t.geometryVertexAttributeUpdated(t.geometries[a],"groundDistance"))}}function qi(t,e,a,i,n,r){let l=0;const d=r.spatialReference;e*=3,i*=3;for(let o=0;o<n;++o){const c=t[e],p=t[e+1],m=t[e+2],v=r.getElevation(c,p,m,d,"ground")??0;l+=v,a[i]=c,a[i+1]=p,a[i+2]=v,e+=3,i+=3}return l/n}function Xi(t,e,a,i,n,r,l,d){let o=0;const c=d.calculateOffsetRenderUnits(l),p=d.featureExpressionInfoContext,m=r.spatialReference;e*=3,i*=3;for(let v=0;v<n;++v){const f=t[e],h=t[e+1],N=t[e+2],g=r.getElevation(f,h,N,m,"ground")??0;o+=g,a[i]=f,a[i+1]=h,a[i+2]=p==null?N+g+c:g+c,e+=3,i+=3}return o/n}function Yi(t,e,a,i,n,r,l,d){let o=0;const c=d.calculateOffsetRenderUnits(l),p=d.featureExpressionInfoContext,m=r.spatialReference;e*=3,i*=3;for(let v=0;v<n;++v){const f=t[e],h=t[e+1],N=t[e+2],g=r.getElevation(f,h,N,m,"scene")??0;o+=g,a[i]=f,a[i+1]=h,a[i+2]=p==null?N+g+c:g+c,e+=3,i+=3}return o/n}function Zi(t){const e=t.meterUnitOffset,a=t.featureExpressionInfoContext;return e!==0||a!=null}function Qi(t,e,a,i,n,r,l,d){const o=d.calculateOffsetRenderUnits(l),c=d.featureExpressionInfoContext;e*=3,i*=3;for(let p=0;p<n;++p){const m=t[e],v=t[e+1],f=t[e+2];a[i]=m,a[i+1]=v,a[i+2]=c==null?f+o:o,e+=3,i+=3}return 0}class Ki{constructor(){this.verticalDistanceToGround=0,this.sampledElevation=0,this.z=0}}const ea={"absolute-height":{applyElevationAlignmentBuffer:Qi,requiresAlignment:Zi},"on-the-ground":{applyElevationAlignmentBuffer:qi,requiresAlignment:()=>!0},"relative-to-ground":{applyElevationAlignmentBuffer:Xi,requiresAlignment:()=>!0},"relative-to-scene":{applyElevationAlignmentBuffer:Yi,requiresAlignment:()=>!0}},ta=xt(),ce=new Ki,De=_();let ia=class{constructor(e,a){this.vec3=e,this.id=a}};function pt(t,e,a,i){return new ia(Et(t,e,a),i)}const W={dash:[4,3],dot:[1,3],"long-dash":[8,3],"short-dash":[4,1],"short-dot":[1,1]},aa={dash:W.dash,"dash-dot":[...W.dash,...W.dot],dot:W.dot,"long-dash":W["long-dash"],"long-dash-dot":[...W["long-dash"],...W.dot],"long-dash-dot-dot":[...W["long-dash"],...W.dot,...W.dot],none:null,"short-dash":W["short-dash"],"short-dash-dot":[...W["short-dash"],...W["short-dot"]],"short-dash-dot-dot":[...W["short-dash"],...W["short-dot"],...W["short-dot"]],"short-dot":W["short-dot"],solid:null},na=8;let ra=class{constructor(e,a,i){this.image=e,this.width=a,this.length=i,this.uuid=Wt()}};function Pt(t){return t!=null&&"image"in t}function sa(t,e){return t==null?t:{pattern:t.slice(),pixelRatio:e}}function cn(t){return{pattern:[t,t],pixelRatio:2}}function dn(t){switch(t?.type){case"style":return oa(t.style);case"image":return new ra(t.image,t.width,t.length);case void 0:case null:return null}return null}function oa(t){return t!=null?sa(aa[t],na):null}const ft=8;function la(t,e){const{vertex:a,attributes:i}=t;a.uniforms.add(new Y("intrinsicWidth",l=>l.width));const{hasScreenSizePerspective:n,spherical:r}=e;n?(t.include(ji,e),Ni(a),bt(a,e),a.uniforms.add(new ni("inverseViewMatrix",(l,d)=>Vt(ht,It(ht,d.camera.viewMatrix,l.origin)))),a.code.add(s`
      float applyLineSizeScreenSizePerspective(float size, vec3 pos) {
        vec3 worldPos = (inverseViewMatrix * vec4(pos, 1)).xyz;
        vec3 groundUp = ${r?s`normalize(worldPos + localOrigin)`:s`vec3(0.0, 0.0, 1.0)`};
        float absCosAngle = abs(dot(groundUp, normalize(worldPos - cameraPosition)));

        return screenSizePerspectiveScaleFloat(size, absCosAngle, length(pos), screenSizePerspective);
      }
    `)):a.code.add(s`float applyLineSizeScreenSizePerspective(float size, vec3 pos) {
return size;
}`),e.hasVVSize?(i.add("sizeFeatureAttribute","float"),a.uniforms.add(new pe("vvSizeMinSize",l=>l.vvSize.minSize),new pe("vvSizeMaxSize",l=>l.vvSize.maxSize),new pe("vvSizeOffset",l=>l.vvSize.offset),new pe("vvSizeFactor",l=>l.vvSize.factor),new pe("vvSizeFallback",l=>l.vvSize.fallback)),a.code.add(s`
    float getSize(${A(n,"vec3 pos")}) {
      float size = isnan(sizeFeatureAttribute)
        ? vvSizeFallback.x
        : intrinsicWidth * clamp(vvSizeOffset + sizeFeatureAttribute * vvSizeFactor, vvSizeMinSize, vvSizeMaxSize).x;

      return ${A(n,"applyLineSizeScreenSizePerspective(size, pos)","size")};
    }
    `)):(i.add("size","float"),a.code.add(s`
    float getSize(${A(n,"vec3 pos")}) {
      float fullSize = intrinsicWidth * size;
      return ${A(n,"applyLineSizeScreenSizePerspective(fullSize, pos)","fullSize")};
    }
    `)),e.hasVVOpacity?(i.add("opacityFeatureAttribute","float"),a.constants.add("vvOpacityNumber","int",8),a.uniforms.add(new tt("vvOpacityValues",ft,l=>l.vvOpacity.values),new tt("vvOpacityOpacities",ft,l=>l.vvOpacity.opacityValues),new Y("vvOpacityFallback",l=>l.vvOpacity.fallback,{supportsNaN:!0})),a.code.add(s`
    float interpolateOpacity(float value) {
      if (value <= vvOpacityValues[0]) {
        return vvOpacityOpacities[0];
      }

      for (int i = 1; i < vvOpacityNumber; ++i) {
        if (vvOpacityValues[i] >= value) {
          float f = (value - vvOpacityValues[i-1]) / (vvOpacityValues[i] - vvOpacityValues[i-1]);
          return mix(vvOpacityOpacities[i-1], vvOpacityOpacities[i], f);
        }
      }

      return vvOpacityOpacities[vvOpacityNumber - 1];
    }

    vec4 applyOpacity(vec4 color) {
      if (isnan(opacityFeatureAttribute)) {
        // If there is a color vv then it will already have taken care of applying the fallback
        return ${A(e.hasVVColor,"color","vec4(color.rgb, vvOpacityFallback)")};
      }

      return vec4(color.rgb, interpolateOpacity(opacityFeatureAttribute));
    }
    `)):a.code.add(s`vec4 applyOpacity(vec4 color) {
return color;
}`),e.hasVVColor?(t.include(ri,e),i.add("colorFeatureAttribute","float"),a.code.add(s`vec4 getColor() {
vec4 color = interpolateVVColor(colorFeatureAttribute);
if (isnan(color.r)) {
return vec4(0);
}
return applyOpacity(color);
}`)):(i.add("color","vec4"),a.code.add(s`vec4 getColor() {
return applyOpacity(color);
}`))}const ht=xt();function ca(t){t.vertex.code.add("#define noPerspectiveWrite(x, w) (x * w)")}function Je(t){t.fragment.code.add("#define noPerspectiveRead(x) (x * gl_FragCoord.w)")}function da(t){return t.pattern.map(e=>Math.round(e*t.pixelRatio))}function pa(t){if(t==null)return 1;const e=da(t);return Math.floor(e.reduce((a,i)=>a+i))}function fa(t){return t==null?Mt:t.length===4?t:Te(ha,t[0],t[1],t[2],1)}const ha=yt();function ua(t,e){if(!e.stippleEnabled)return void t.fragment.code.add(s`float getStippleAlpha(float lineWidth) { return 1.0; }
void discardByStippleAlpha(float stippleAlpha, float threshold) {}
vec4 blendStipple(vec4 color, float stippleAlpha) { return color; }`);const a=!(e.draped&&e.stipplePreferContinuous),{vertex:i,fragment:n}=t;e.draped||(bt(i,e),i.uniforms.add(new Ge("worldToScreenPerDistanceRatio",({camera:r})=>1/r.perScreenPixelRatio)).code.add(s`float computeWorldToScreenRatio(vec3 segmentCenter) {
float segmentDistanceToCamera = length(segmentCenter - cameraPosition);
return worldToScreenPerDistanceRatio / segmentDistanceToCamera;
}`)),t.varyings.add("vStippleDistance","float"),t.varyings.add("vStippleDistanceLimits","vec2"),t.varyings.add("vStipplePatternStretch","float"),i.code.add(s`
    float discretizeWorldToScreenRatio(float worldToScreenRatio) {
      float step = ${s.float(ma)};

      float discreteWorldToScreenRatio = log(worldToScreenRatio);
      discreteWorldToScreenRatio = ceil(discreteWorldToScreenRatio / step) * step;
      discreteWorldToScreenRatio = exp(discreteWorldToScreenRatio);
      return discreteWorldToScreenRatio;
    }
  `),qe(i),i.code.add(s`
    vec2 computeStippleDistanceLimits(float startPseudoScreen, float segmentLengthPseudoScreen, float segmentLengthScreen, float patternLength) {

      // First check if the segment is long enough to support fully screen space patterns.
      // Force sparse mode for segments that are very large in screen space even if it is not allowed,
      // to avoid imprecision from calculating with large floats.
      if (segmentLengthPseudoScreen >= ${a?"patternLength":"1e4"}) {
        // Round the screen length to get an integer number of pattern repetitions (minimum 1).
        float repetitions = segmentLengthScreen / (patternLength * pixelRatio);
        float flooredRepetitions = max(1.0, floor(repetitions + 0.5));
        float segmentLengthScreenRounded = flooredRepetitions * patternLength;

        float stretch = repetitions / flooredRepetitions;

        // We need to impose a lower bound on the stretch factor to prevent the dots from merging together when there is only 1 repetition.
        // 0.75 is the lowest possible stretch value for flooredRepetitions > 1, so it makes sense as lower bound.
        vStipplePatternStretch = max(0.75, stretch);

        return vec2(0.0, segmentLengthScreenRounded);
      }
      return vec2(startPseudoScreen, startPseudoScreen + segmentLengthPseudoScreen);
    }
  `),n.uniforms.add(new si("stipplePatternTexture",r=>r.stippleTexture),new Y("stipplePatternPixelSizeInv",r=>1/wt(r))),e.stippleOffColorEnabled&&n.uniforms.add(new ke("stippleOffColor",r=>fa(r.stippleOffColor))),t.include(Je),e.worldSizedImagePattern?(t.varyings.add("vStippleV","float"),t.fragment.include(ki),n.code.add(s`vec4 getStippleColor(out bool isClamped) {
vec2 aaCorrectedLimits = vStippleDistanceLimits + vec2(1.0, -1.0) / gl_FragCoord.w;
isClamped = vStippleDistance < aaCorrectedLimits.x || vStippleDistance > aaCorrectedLimits.y;
float u = vStippleDistance * stipplePatternPixelSizeInv;
float v = vStippleV == -1.0 ? 0.5 : vStippleV;
return texture(stipplePatternTexture, vec2(u, v));
}
vec4 getStippleColor() {
bool ignored;
return getStippleColor(ignored);
}
float getStippleSDF() {
vec4 color = getStippleColor();
return color.a == 0.0 ? -0.5 : 0.5;
}
float getStippleAlpha(float lineWidth) {
return getStippleColor().a;
}
vec4 blendStipple(vec4 color, float stippleAlpha) {
vec4 stippleColor = getStippleColor();
int mixMode  = 1;
vec3 col = mixExternalColor(color.rgb, vec3(1.0), stippleColor.rgb, mixMode);
float opacity = mixExternalOpacity(color.a, 1.0, stippleColor.a, mixMode);
return vec4(col, opacity);
}`)):n.code.add(s`
    float getStippleSDF(out bool isClamped) {
      float stippleDistanceClamped = noPerspectiveRead(clamp(vStippleDistance, vStippleDistanceLimits.x, vStippleDistanceLimits.y));
      float lineSizeInv = noPerspectiveRead(vLineSizeInv);

      vec2 aaCorrectedLimits = vStippleDistanceLimits + vec2(1.0, -1.0) / gl_FragCoord.w;
      isClamped = vStippleDistance < aaCorrectedLimits.x || vStippleDistance > aaCorrectedLimits.y;

      float u = stippleDistanceClamped * stipplePatternPixelSizeInv * lineSizeInv;
      u = fract(u);

      float sdf = texture(stipplePatternTexture, vec2(u, 0.5)).r;

      return (sdf - 0.5) * vStipplePatternStretch + 0.5;
    }

    float getStippleSDF() {
      bool ignored;
      return getStippleSDF(ignored);
    }

    float getStippleAlpha(float lineWidth) {
      bool isClamped;
      float stippleSDF = getStippleSDF(isClamped);
      float antiAliasedResult = clamp(stippleSDF * lineWidth + 0.5, 0.0, 1.0);
      return isClamped ? floor(antiAliasedResult + 0.5) : antiAliasedResult;
    }

    vec4 blendStipple(vec4 color, float stippleAlpha) {
      return ${e.stippleOffColorEnabled?"mix(color, stippleOffColor, stippleAlpha)":"vec4(color.rgb, color.a * stippleAlpha)"};
    }
  `),n.code.add(s`
    void discardByStippleAlpha(float stippleAlpha, float threshold) {
     ${A(!e.stippleOffColorEnabled,"if (stippleAlpha < threshold) { discard; }")}
    }
  `)}function wt(t){const e=t.stipplePattern;return Pt(e)?e.length:e?pa(e)/e.pixelRatio:1}const ma=.4,Lt=64,va=Lt/2,ga=va/5,Sa=Lt/ga,pn=.25;function xa(t,e){const a=t.vertex,i=e.hasScreenSizePerspective;qe(a),a.uniforms.get("markerScale")==null&&a.constants.add("markerScale","float",1),a.constants.add("markerSizePerLineWidth","float",Sa).code.add(s`
  float getLineWidth(${A(i,"vec3 pos")}) {
     return max(getSize(${A(i,"pos")}), 1.0) * pixelRatio;
  }

  float getScreenMarkerSize(float lineWidth) {
    return markerScale * markerSizePerLineWidth * lineWidth;
  }
  `),e.space===2&&(a.constants.add("maxSegmentLengthFraction","float",.45),a.uniforms.add(new Ge("perRenderPixelRatio",n=>n.camera.perRenderPixelRatio)),a.code.add(s`
  bool areWorldMarkersHidden(vec3 pos, vec3 other) {
    vec3 midPoint = mix(pos, other, 0.5);
    float distanceToCamera = length(midPoint);
    float screenToWorldRatio = perRenderPixelRatio * distanceToCamera * 0.5;
    float worldMarkerSize = getScreenMarkerSize(getLineWidth(${A(i,"pos")})) * screenToWorldRatio;
    float segmentLen = length(pos - other);
    return worldMarkerSize > maxSegmentLengthFraction * segmentLen;
  }

  float getWorldMarkerSize(vec3 pos) {
    float distanceToCamera = length(pos);
    float screenToWorldRatio = perRenderPixelRatio * distanceToCamera * 0.5;
    return getScreenMarkerSize(getLineWidth(${A(i,"pos")})) * screenToWorldRatio;
  }
  `))}const ya=s`vec4(0.0, 0.0, 2.0, 1.0)`,ba=he(1),Da=he(1);function za(t,e){const{hasAnimation:a,animation:i}=e;if(!a)return;const{attributes:n,varyings:r,vertex:l,fragment:d}=t;n.add("timeStamps","vec4"),r.add("vTimeStamp","float"),r.add("vFirstTime","float"),r.add("vLastTime","float"),r.add("vTransitionType","float"),l.main.add(s`vTimeStamp = timeStamps.x;
vFirstTime = timeStamps.y;
vLastTime = timeStamps.z;
vTransitionType = timeStamps.w;`),i===3&&d.constants.add("decayRate","float",2.3),d.code.add(s`
    float getTrailOpacity(float x) {
      if (x < 0.0) {
        return 0.0;
      }

      ${Ta(i)}
    }`),d.uniforms.add(new Y("timeElapsed",o=>o.timeElapsed),new Y("trailLength",o=>o.trailLength),new Y("speed",o=>o.animationSpeed),new Ji("startEndTime",o=>jt(Pa,o.startTime,o.endTime))),d.constants.add("fadeInTime","float",Da),d.constants.add("fadeOutTime","float",ba),d.constants.add("incomingTransition","int",0),d.constants.add("outgoingTransition","int",2),d.code.add(s`float fadeIn(float x) {
return smoothstep(0.0, fadeInTime, x);
}
float fadeOut(float x) {
return isinf(fadeOutTime) ? 1.0 : smoothstep(fadeOutTime, 0.0, x);
}
void updateAlphaIf(inout float alpha, bool condition, float newAlpha) {
alpha = condition ? min(alpha, newAlpha) : alpha;
}
vec4 animate(vec4 color) {
float startTime = startEndTime[0];
float endTime = startEndTime[1];
float totalTime = vLastTime - vFirstTime;
float actualFadeOutTime = min(fadeOutTime * speed, trailLength);
float longStreamlineThreshold = (fadeInTime + 1.0) * speed + actualFadeOutTime;
bool longStreamline = totalTime > longStreamlineThreshold;
float totalTimeWithFadeOut = longStreamline && actualFadeOutTime != trailLength ? totalTime : totalTime + actualFadeOutTime;
float fadeOutStartTime = longStreamline ? totalTime - actualFadeOutTime : totalTime;
float originTime =  -vFirstTime;
float actualEndTime = int(vTransitionType) == outgoingTransition ? min(endTime, startTime + vLastTime / speed) : endTime;
vec4 animatedColor = color;
if (speed == 0.0) {
float alpha = getTrailOpacity((totalTimeWithFadeOut - (vTimeStamp - vFirstTime)) / trailLength);
updateAlphaIf(alpha, !isinf(actualEndTime), fadeOut(timeElapsed - actualEndTime));
updateAlphaIf(alpha, true, fadeIn(timeElapsed - startTime));
animatedColor.a *= alpha;
return animatedColor;
}
float relativeStartTime = mod(startTime, totalTimeWithFadeOut);
float shiftedTimeElapsed = timeElapsed - relativeStartTime + originTime;
float headRelativeToFirst = mod(shiftedTimeElapsed * speed, totalTimeWithFadeOut);
float vRelativeToHead = headRelativeToFirst - originTime - vTimeStamp;
float vAbsoluteTime = timeElapsed - vRelativeToHead / speed;
if (startTime > timeElapsed) {
return vec4(0.0);
}
float alpha = getTrailOpacity(vRelativeToHead / trailLength);
updateAlphaIf(alpha, true, fadeIn(timeElapsed - startTime));
updateAlphaIf(alpha, !isinf(actualEndTime), fadeOut(timeElapsed - actualEndTime));
updateAlphaIf(alpha, int(vTransitionType) != incomingTransition, step(startTime, vAbsoluteTime));
updateAlphaIf(alpha, headRelativeToFirst > fadeOutStartTime, fadeOut((headRelativeToFirst - fadeOutStartTime) / speed));
alpha *= fadeIn(vTimeStamp - vFirstTime);
animatedColor.a *= alpha;
return animatedColor;
}`)}function Ta(t){switch(t){case 2:return"return x >= 0.0 && x <= 1.0 ? 1.0 : 0.0;";case 3:return`float cutOff = exp(-decayRate);
        return (exp(-decayRate * x) - cutOff) / (1.0 - cutOff);`;default:return"return 1.0;"}}const Pa=Nt(),Xe=1;function $t(t){const e=new Hi,{attributes:a,varyings:i,vertex:n,fragment:r}=e,{applyMarkerOffset:l,draped:d,output:o,capType:c,stippleEnabled:p,falloffEnabled:m,roundJoins:v,wireframe:f,innerColorEnabled:h,hasAnimation:N,hasScreenSizePerspective:g,worldSizedImagePattern:C}=t;n.inputs.add("position",()=>"position"),r.include(Ui),e.include(la,t),e.include(ua,t),e.include(oi,t),e.include(za,t);const B=l&&!d;B&&(n.uniforms.add(new Y("markerScale",u=>u.markerScale)),e.include(xa,{space:2,hasScreenSizePerspective:g})),li(n,t),n.uniforms.add(new ci("inverseProjectionMatrix",u=>u.camera.inverseProjectionMatrix),new di("nearFar",u=>u.camera.nearFar),new Y("miterLimit",u=>u.join!=="miter"?0:u.miterLimit),new Bi("viewport",u=>u.camera.fullViewport)),n.constants.add("LARGE_HALF_FLOAT","float",65500),n.constants.add("EPS","float",.001),n.constants.add("NUM_JOIN_SUBDIVISIONS","float",t.numJoinSubdivisions),a.add("position","vec3"),a.add("previousDelta","vec4"),a.add("nextDelta","vec4"),a.add("lineParameters","vec2"),a.add("u0","float"),i.add("vColor","vec4"),i.add("vpos","vec3",{invariant:!0}),i.add("vLineDistance","float"),i.add("vLineWidth","float"),p||(i.add("vIsInsideJoin","int"),i.add("vStretchFactor","float"),i.add("vJoinCenterLineSDFs","vec2"),i.add("vSubdivisionFactor","float"));const q=p;q&&i.add("vLineSizeInv","float");const b=c===2,x=p&&b,R=m||x;R&&i.add("vLineDistanceNorm","float"),b&&(i.add("vSegmentSDF","float"),i.add("vReverseSegmentSDF","float")),n.code.add(s`vec3 perpendicular(vec3 v) {
return vec3(v.y, -v.x, 0.0);
}
float interp(float ncp, vec4 a, vec4 b) {
return (-ncp - a.z) / (b.z - a.z);
}
vec3 rotateZ(vec3 v, float a) {
float s = sin(a);
float c = cos(a);
mat2 m = mat2(c, -s, s, c);
return vec3(m * v.xy, v.z);
}`),n.code.add(s`vec4 projectAndScale(vec4 pos) {
vec4 posNdc = proj * pos;
posNdc.xy *= viewport.zw / posNdc.w;
posNdc.z /= posNdc.w;
return posNdc;
}`),n.code.add(s`void clip(
inout vec4 pos,
inout vec4 prev,
inout vec4 next,
bool isStartVertex
) {
float vnp = nearFar[0] * 0.99;
if (pos.z > -nearFar[0]) {
if (!isStartVertex) {
if (prev.z < -nearFar[0]) {
pos = mix(prev, pos, interp(vnp, prev, pos));
next = pos;
} else {
pos = vec4(0.0, 0.0, 0.0, 1.0);
}
} else {
if (next.z < -nearFar[0]) {
pos = mix(pos, next, interp(vnp, pos, next));
prev = pos;
} else {
pos = vec4(0.0, 0.0, 0.0, 1.0);
}
}
} else {
if (prev.z > -nearFar[0]) {
prev = mix(pos, prev, interp(vnp, pos, prev));
}
if (next.z > -nearFar[0]) {
next = mix(next, pos, interp(vnp, next, pos));
}
}
}`),qe(n),n.constants.add("aaWidth","float",p?0:1).main.add(s`
    // unpack values from vertex type
    bool isStartVertex = abs(abs(lineParameters.y) - 3.0) == 1.0;
    vec3 prevPosition = position + previousDelta.xyz * previousDelta.w;
    vec3 nextPosition = position + nextDelta.xyz * nextDelta.w;

    float coverage = 1.0;

    // Check for special value of lineParameters.y which is used by the Renderer when graphics are removed before the
    // VBO is recompacted. If this is the case, then we just project outside of clip space.
    if (lineParameters.y == 0.0) {
      gl_Position = ${ya};
    }
    else {
      vec4 pos  = view * vec4(position, 1.0);
      vec4 prev = view * vec4(prevPosition, 1.0);
      vec4 next = view * vec4(nextPosition, 1.0);

      bool isJoin = abs(lineParameters.y) < 3.0;
  `),B&&n.main.add(s`vec4 other = isStartVertex ? next : prev;
bool markersHidden = areWorldMarkersHidden(pos.xyz, other.xyz);
if (!isJoin && !markersHidden) {
pos.xyz += normalize(other.xyz - pos.xyz) * getWorldMarkerSize(pos.xyz) * 0.5;
}`),e.include(ca),n.main.add(s`
      clip(pos, prev, next, isStartVertex);

      vec3 clippedPos = pos.xyz;
      vec3 clippedCenter = mix(pos.xyz, isStartVertex ? next.xyz : prev.xyz, 0.5);

      pos = projectAndScale(pos);
      next = projectAndScale(next);
      prev = projectAndScale(prev);

      vec3 left = (pos.xyz - prev.xyz);
      vec3 right = (next.xyz - pos.xyz);

      float leftLen = length(left);
      float rightLen = length(right);

      float lineSize = getSize(${A(g,"clippedPos")});
      ${A(p&&g,"float patternLineSize = getSize(clippedCenter);")}
      ${A(p&&!g,"float patternLineSize = lineSize;")}

      ${A(C,s`
          lineSize += aaWidth;
          float lineWidth = lineSize * pixelRatio * worldToScreenRatio;
          if (lineWidth < 1.0) {
            coverage = lineWidth;
            lineWidth = 1.0;
          }
        `,s`
          if (lineSize < 1.0) {
            coverage = lineSize; // convert sub-pixel coverage to alpha
            lineSize = 1.0;
          }

          lineSize += aaWidth;
          float lineWidth = lineSize * pixelRatio;
        `)}

      vLineWidth = noPerspectiveWrite(lineWidth, pos.w);
      ${q?s`vLineSizeInv = noPerspectiveWrite(1.0 / lineSize, pos.w);`:""}
  `),(p||b)&&n.main.add(s`
      float isEndVertex = float(!isStartVertex);
      vec3 segmentOrigin = mix(pos.xyz, prev.xyz, isEndVertex);
      vec3 segment = mix(right, left, isEndVertex);
      ${b?s`vec3 segmentEnd = mix(next.xyz, pos.xyz, isEndVertex);`:""}
    `),n.main.add(s`left = (leftLen > EPS) ? left/leftLen : vec3(0.0, 0.0, 0.0);
right = (rightLen > EPS) ? right/rightLen : vec3(0.0, 0.0, 0.0);
vec3 segmentDirection = isStartVertex ? right : left;
vec3 capDisplacementDir = vec3(0.0, 0.0, 0.0);
vec3 joinDisplacementDir = vec3(0.0, 0.0, 0.0);
float displacementLen = lineWidth;
float miterDisplacementLen = lineWidth;
float innerDisplacementLen = lineWidth;`),p||n.main.add(s`vIsInsideJoin = 0;
vStretchFactor = 1.0;
vSubdivisionFactor = 0.0;
vJoinCenterLineSDFs = vec2(LARGE_HALF_FLOAT);`),n.main.add(s`float subdivisionFactor = 0.0;
bool isOutside = false;
if (isJoin) {
isOutside = (left.x * right.y - left.y * right.x) * lineParameters.y > 0.0;
vec3 joinDirection = normalize(left + right);
joinDisplacementDir = perpendicular(joinDirection);
if (leftLen > EPS && rightLen > EPS) {
float nDotSeg = dot(joinDisplacementDir, left);
displacementLen /= length(nDotSeg * left - joinDisplacementDir);
miterDisplacementLen = displacementLen;
innerDisplacementLen = min(displacementLen, min(leftLen, rightLen)/abs(nDotSeg));
if (!isOutside) {
displacementLen = innerDisplacementLen;
}
}
subdivisionFactor = lineParameters.x;`),p||n.main.add(s`if(subdivisionFactor > 0.0) {
vIsInsideJoin = 1;
}
vSubdivisionFactor = isOutside ? subdivisionFactor : 0.5;
if (miterDisplacementLen > miterLimit * lineWidth) {
vec2 leftScreenDir = left.xy;
vec2 rightScreenDir = right.xy;
float leftScreenLen = length(leftScreenDir);
float rightScreenLen = length(rightScreenDir);
if (leftScreenLen > EPS && rightScreenLen > EPS) {
leftScreenDir /= leftScreenLen;
rightScreenDir /= rightScreenLen;
float theta = acos(clamp(dot(leftScreenDir, rightScreenDir), -1.0, 1.0));
float subdividedTriangleHeight = (innerDisplacementLen + lineWidth) * cos(theta / (2.0 + 2.0 * NUM_JOIN_SUBDIVISIONS));
float bevelTriangleHeight = innerDisplacementLen + lineWidth * cos(theta * 0.5);
float triangleHeight = NUM_JOIN_SUBDIVISIONS > 0.0 ? subdividedTriangleHeight : bevelTriangleHeight;
vStretchFactor = noPerspectiveWrite(max(triangleHeight / (2.0 * lineWidth), 1.0), pos.w);
}
}`),n.main.add(s`if (isOutside && (displacementLen > miterLimit * lineWidth)) {`),v?n.main.add(s`
        vec3 startDir = leftLen < EPS ? right : left;
        startDir = perpendicular(startDir);

        vec3 endDir = rightLen < EPS ? left : right;
        endDir = perpendicular(endDir);

        float factor = ${p?s`min(1.0, subdivisionFactor * ((NUM_JOIN_SUBDIVISIONS + 1.0) / NUM_JOIN_SUBDIVISIONS))`:s`subdivisionFactor`};

        float rotationAngle = acos(clamp(dot(startDir.xy, endDir.xy), -1.0, 1.0));
        joinDisplacementDir = rotateZ(startDir, -sign(lineParameters.y) * factor * rotationAngle);
      `):n.main.add(s`
        vec3 startDir = perpendicular(leftLen < EPS ? right : left);
        vec3 endDir = perpendicular(rightLen < EPS ? left : right);

        ${A(p,s`joinDisplacementDir = (isStartVertex || subdivisionFactor > 0.0) ? endDir : startDir;`,s`joinDisplacementDir = mix(startDir, endDir, subdivisionFactor);`)}
  `);const E=c!==0;return n.main.add(s`
        displacementLen = lineWidth;
      }
    } else {
      // CAP handling ---------------------------------------------------
      joinDisplacementDir = isStartVertex ? right : left;
      joinDisplacementDir = perpendicular(joinDisplacementDir);

      ${E?s`capDisplacementDir = vec3((isStartVertex ? -right : left).xy, 0.0);`:""}
    }
  `),n.main.add(s`
    // Displacement (in pixels) caused by join/or cap
    vec2 dposXY = (joinDisplacementDir.xy * sign(lineParameters.y) + capDisplacementDir.xy) * displacementLen;

    /**
     * To prevent z-fighting between layers, we also adjust the z value.
     * We want to ensure that the orientation of the final triangles is the same, regardless of the line width.
     * To do so, the below formula projects the xy displacement onto the original segment direction
     * to find the z-offset necessary so the triangle orientation is independent of the width.
     */
    float dposZ = dot(dposXY, segmentDirection.xy) / dot(segmentDirection.xy, segmentDirection.xy) * segmentDirection.z;
    vec3 dpos = vec3(dposXY, dposZ);

    float lineDistNorm = noPerspectiveWrite(sign(lineParameters.y), pos.w);

    vLineDistance = lineWidth * lineDistNorm;
    ${R?s`vLineDistanceNorm = lineDistNorm;`:""}

    pos.xyz += dpos;
  `),p||n.main.add(s`if (isJoin) {
vec2 joinCenterToVertex = dposXY;
vec2 leftCenterlineDir = left.xy;
vec2 rightCenterlineDir = right.xy;
float leftCenterlineLen = length(leftCenterlineDir);
float rightCenterlineLen = length(rightCenterlineDir);
leftCenterlineDir = leftCenterlineLen > EPS ? leftCenterlineDir / leftCenterlineLen : vec2(1.0, 0.0);
rightCenterlineDir = rightCenterlineLen > EPS ? rightCenterlineDir / rightCenterlineLen : leftCenterlineDir;
vJoinCenterLineSDFs = noPerspectiveWrite(
vec2(
dot(vec2(rightCenterlineDir.y, -rightCenterlineDir.x), joinCenterToVertex),
dot(vec2(leftCenterlineDir.y, -leftCenterlineDir.x), joinCenterToVertex)
),
pos.w
);
}`),b&&n.main.add(s`vec2 segmentDir = normalize(segment.xy);
vSegmentSDF = noPerspectiveWrite((isJoin && isStartVertex) ? LARGE_HALF_FLOAT : (dot(pos.xy - segmentOrigin.xy, segmentDir)), pos.w);
vReverseSegmentSDF = noPerspectiveWrite((isJoin && !isStartVertex) ? LARGE_HALF_FLOAT : (dot(pos.xy - segmentEnd.xy, -segmentDir)), pos.w);`),p&&(d?n.uniforms.add(new Ge("worldToScreenRatio",u=>1/u.screenToPCSRatio)):n.main.add(s`vec3 segmentCenter = mix((nextPosition + position) * 0.5, (position + prevPosition) * 0.5, isEndVertex);
float worldToScreenRatio = computeWorldToScreenRatio(segmentCenter);`),n.main.add(s`float segmentLengthScreenDouble = length(segment.xy);
float segmentLengthScreen = segmentLengthScreenDouble * 0.5;
float discreteWorldToScreenRatio = discretizeWorldToScreenRatio(worldToScreenRatio);
float segmentLengthRender = length(mix(nextPosition - position, position - prevPosition, isEndVertex));
vStipplePatternStretch = worldToScreenRatio / discreteWorldToScreenRatio;`),d?n.main.add(s`float segmentLengthPseudoScreen = segmentLengthScreen / pixelRatio * discreteWorldToScreenRatio / worldToScreenRatio;
float startPseudoScreen = u0 * discreteWorldToScreenRatio - mix(0.0, segmentLengthPseudoScreen, isEndVertex);`):n.main.add(s`float startPseudoScreen = mix(u0, u0 - segmentLengthRender, isEndVertex) * discreteWorldToScreenRatio;
float segmentLengthPseudoScreen = segmentLengthRender * discreteWorldToScreenRatio;`),n.uniforms.add(new Y("stipplePatternPixelSize",u=>wt(u))),n.main.add(s`
      float patternLength = patternLineSize * stipplePatternPixelSize;

      ${A(C,s`
          float uu = mix(u0, u0 - segmentLengthRender, isEndVertex);
          vStippleDistanceLimits = vec2(uu, uu + segmentLengthRender);
          vStipplePatternStretch = 1.0;

          // The v-coordinate used in case of an image pattern.
          bool isLeft = sign(lineParameters.y) < 0.0;
          vStippleV = isLeft ? 0.0 : 1.0;
        `,s`
          // Compute the coordinates at both start and end of the line segment, because we need both to clamp to in the
          // fragment shader
          vStippleDistanceLimits = computeStippleDistanceLimits(startPseudoScreen, segmentLengthPseudoScreen, segmentLengthScreen, patternLength);
        `)}

      vStippleDistance = mix(vStippleDistanceLimits.x, vStippleDistanceLimits.y, isEndVertex);

      // Adjust the coordinate to the displaced position (the pattern is shortened/overextended on the in/outside of
      // joins)
      if (segmentLengthScreenDouble >= EPS) {
        // Project the actual vertex position onto the line segment. Note that the resulting factor is within [0..1]
        // at the original vertex positions, and slightly outside of that range at the displaced positions
        vec3 stippleDisplacement = pos.xyz - segmentOrigin;
        float stippleDisplacementFactor = dot(segment.xy, stippleDisplacement.xy) / (segmentLengthScreenDouble * segmentLengthScreenDouble);

        // Apply this offset to the actual vertex coordinate (can be screen or pseudo-screen space)
        vStippleDistance += (stippleDisplacementFactor - isEndVertex) * (vStippleDistanceLimits.y - vStippleDistanceLimits.x);
      }

      // Cancel out perspective correct interpolation because we want this length the really represent the screen
      // distance
      vStippleDistanceLimits = noPerspectiveWrite(vStippleDistanceLimits, pos.w);
      vStippleDistance = noPerspectiveWrite(vStippleDistance, pos.w);

      // Disable stipple distance limits on caps
      vStippleDistanceLimits = isJoin ?
                                 vStippleDistanceLimits :
                                 isStartVertex ?
                                  vec2(-1e34, vStippleDistanceLimits.y) :
                                  vec2(vStippleDistanceLimits.x, 1e34);
    `)),n.main.add(s`
      // Convert back into NDC
      pos.xy = (pos.xy / viewport.zw) * pos.w;
      pos.z = pos.z * pos.w;

      vColor = getColor();
      vColor.a = noPerspectiveWrite(vColor.a * coverage, pos.w);

      ${f&&!d?"pos.z -= EPS * pos.w;":""}

      // transform final position to camera space for slicing
      vpos = (inverseProjectionMatrix * pos).xyz;
      gl_Position = pos;
      forwardObjectAndLayerIdColor();
    }`),e.fragment.include(pi,t),e.include(fi,t),r.include(hi),r.main.add(s`discardBySlice(vpos);`),e.include(Je),r.include(ui),r.main.add(s`
    float lineWidth = noPerspectiveRead(vLineWidth);
    float lineDistance = noPerspectiveRead(vLineDistance);
    ${A(R,s`float lineDistanceNorm = noPerspectiveRead(vLineDistanceNorm);`)}
  `),f?r.main.add(s`vec4 finalColor = vec4(1.0, 0.0, 1.0, 1.0);`):(b&&r.main.add(s`float sdf = noPerspectiveRead(min(vSegmentSDF, vReverseSegmentSDF));
vec2 fragmentPosition = vec2(min(sdf, 0.0), lineDistance);
float fragmentRadius = length(fragmentPosition);
float fragmentCapSDF = (fragmentRadius - lineWidth) * 0.5;
float capCoverage = clamp(0.5 - fragmentCapSDF, 0.0, 1.0);
if (capCoverage < alphaCutoff) {
discard;
}`),x?r.main.add(s`vec2 stipplePosition = vec2(
min(getStippleSDF() * 2.0 - 1.0, 0.0),
lineDistanceNorm
);
float stippleRadius = length(stipplePosition * lineWidth);
float stippleCapSDF = (stippleRadius - lineWidth) * 0.5;
float stippleCoverage = clamp(0.5 - stippleCapSDF, 0.0, 1.0);
float stippleAlpha = step(alphaCutoff, stippleCoverage);`):r.main.add(s`float stippleAlpha = getStippleAlpha(lineWidth);`),o!==11&&r.main.add(s`discardByStippleAlpha(stippleAlpha, alphaCutoff);`),e.include(Je),r.uniforms.add(new ke("intrinsicColor",u=>u.color)).main.add(s`vec4 color = intrinsicColor * vColor;
color.a = noPerspectiveRead(color.a);`),h&&r.uniforms.add(new ke("innerColor",u=>u.innerColor??u.color),new Y("innerWidth",(u,$)=>u.innerWidth*$.camera.pixelRatio)).main.add(s`float distToInner = abs(lineDistance) - innerWidth;
float innerAA = clamp(0.5 - distToInner, 0.0, 1.0);
float innerAlpha = innerColor.a + color.a * (1.0 - innerColor.a);
color = mix(color, vec4(innerColor.rgb, innerAlpha), innerAA);`),r.main.add(s`vec4 finalColor = blendStipple(color, stippleAlpha);`),m&&(r.uniforms.add(new Y("falloff",u=>u.falloff)),r.main.add(s`finalColor.a *= pow(max(0.0, 1.0 - abs(lineDistanceNorm)), falloff);`)),p||r.main.add(s`float stretchFactor = vIsInsideJoin == 1 ? noPerspectiveRead(vStretchFactor) : 1.0;
float featherWidth = 2.0;
float featherStartDistance = max(lineWidth - featherWidth / stretchFactor, 0.0);
float straightFeatherStartDistance = max(lineWidth - featherWidth, 0.0);
float value = abs(lineDistance);
float feather = (value - featherStartDistance) / (lineWidth - featherStartDistance);
vec2 joinCenterSDFs = noPerspectiveRead(vJoinCenterLineSDFs);
float joinCenterDistance = abs(vSubdivisionFactor > 0.5 ? joinCenterSDFs.x : joinCenterSDFs.y);
float straightFeather = (joinCenterDistance - straightFeatherStartDistance) / (lineWidth - straightFeatherStartDistance);
feather = vIsInsideJoin == 1 ? max(feather, straightFeather) : feather;
finalColor.a *= 1.0 - clamp(feather, 0.0, 1.0);`),N&&r.main.add(s`
        finalColor = animate(finalColor);

        ${A(o!==11,s`
            if (finalColor.a <= alphaCutoff) {
              discard;
            }`)}
      `)),r.main.add(s`outputColorHighlightOLID(applySlice(finalColor, vpos), finalColor.rgb);`),e}const wa=Object.freeze(Object.defineProperty({__proto__:null,build:$t,ribbonlineNumRoundJoinSubdivisions:Xe},Symbol.toStringTag,{value:"Module"}));function Ct(t){const e=Ii().vec3f("position").vec4f16("previousDelta").vec4f16("nextDelta").f32("u0").vec2f16("lineParameters");return t.hasVVColor?e.f32("colorFeatureAttribute"):e.vec4u8("color",{glNormalized:!0}),t.hasVVSize?e.f32("sizeFeatureAttribute"):e.f32("size"),t.hasVVOpacity&&e.f32("opacityFeatureAttribute"),Dt()&&e.vec4u8("olidColor"),t.hasAnimation&&e.vec4f16("timeStamps"),e}let Ue=class extends mi{constructor(t,e){super(t,e,Mi(Ct(e))),this.shader=new vi(wa,()=>kt(()=>Promise.resolve().then(()=>ja),void 0,import.meta.url)),this.ignoreUnused=!0,this.primitiveType=e.wireframe?Ze.LINES:Ze.TRIANGLE_STRIP}_makePipelineState(t,e){const{output:a,hasOccludees:i}=t;return be({blending:yi(a,!1,t.emissionDimmingPass),depthTest:xi(a),depthWrite:Si(t),colorWrite:Ae,stencilWrite:i?at:null,stencilTest:i?e?it:gi:null,polygonOffset:xe(t)})}initializePipeline(t){if(t.occluder){const{hasOccludees:e}=t;this._occluderPipelineTransparent=be({blending:dt,polygonOffset:xe(t),depthTest:nt,depthWrite:null,colorWrite:Ae,stencilWrite:null,stencilTest:e?bi:null}),this._occluderPipelineOpaque=be({blending:dt,polygonOffset:xe(t),depthTest:e?nt:rt,depthWrite:null,colorWrite:Ae,stencilWrite:e?zi:null,stencilTest:e?Di:null}),this._occluderPipelineMaskWrite=be({blending:null,polygonOffset:xe(t),depthTest:rt,depthWrite:null,colorWrite:null,stencilWrite:e?at:null,stencilTest:e?it:null})}return this._occludeePipeline=this._makePipelineState(t,!0),this._makePipelineState(t,!1)}getPipeline(t,e,a){if(a)return this._occludeePipeline;switch(t.occluder){case 11:return this._occluderPipelineTransparent??super.getPipeline(t,e,a);case 10:return this._occluderPipelineOpaque??super.getPipeline(t,e,a);default:t.occluder;case void 0:case null:return this._occluderPipelineMaskWrite??super.getPipeline(t,e,a)}}};Ue=T([Jt("esri.views.3d.webgl-engine.shaders.RibbonLineTechnique")],Ue);const La=16,$a=8;class P extends Ti{constructor(e){super(),this.spherical=e,this.capType=0,this.emissionSource=0,this.animation=2,this.polygonOffsetIndex=0,this.writeDepth=!1,this.draped=!1,this.stippleEnabled=!1,this.stippleOffColorEnabled=!1,this.stipplePreferContinuous=!0,this.numJoinSubdivisions=1,this.roundJoins=!1,this.applyMarkerOffset=!1,this.hasVVSize=!1,this.hasVVColor=!1,this.hasVVOpacity=!1,this.falloffEnabled=!1,this.innerColorEnabled=!1,this.hasOccludees=!1,this.occluder=!1,this.wireframe=!1,this.discardInvisibleFragments=!1,this.hasScreenSizePerspective=!1,this.worldSizedImagePattern=!1,this.textureCoordinateType=0,this.hasVVInstancing=!1,this.hasSliceTranslatedView=!0,this.overlayEnabled=!1,this.snowCover=!1}get hasAnimation(){return this.animation!==0}}T([w({count:3})],P.prototype,"capType",void 0),T([w({count:8})],P.prototype,"emissionSource",void 0),T([w({count:4})],P.prototype,"animation",void 0),T([w({count:La})],P.prototype,"polygonOffsetIndex",void 0),T([w()],P.prototype,"writeDepth",void 0),T([w()],P.prototype,"draped",void 0),T([w()],P.prototype,"stippleEnabled",void 0),T([w()],P.prototype,"stippleOffColorEnabled",void 0),T([w()],P.prototype,"stipplePreferContinuous",void 0),T([w({count:$a})],P.prototype,"numJoinSubdivisions",void 0),T([w()],P.prototype,"roundJoins",void 0),T([w()],P.prototype,"applyMarkerOffset",void 0),T([w()],P.prototype,"hasVVSize",void 0),T([w()],P.prototype,"hasVVColor",void 0),T([w()],P.prototype,"hasVVOpacity",void 0),T([w()],P.prototype,"falloffEnabled",void 0),T([w()],P.prototype,"innerColorEnabled",void 0),T([w()],P.prototype,"hasOccludees",void 0),T([w()],P.prototype,"occluder",void 0),T([w()],P.prototype,"wireframe",void 0),T([w()],P.prototype,"discardInvisibleFragments",void 0),T([w()],P.prototype,"hasScreenSizePerspective",void 0),T([w()],P.prototype,"worldSizedImagePattern",void 0);let Ca=class extends Pi{constructor(e,a){super(e,_a),this.produces=new Map([[2,i=>wi(i)||Re(i)&&this.parameters.renderOccluded===8],[3,i=>Li(i)],[10,i=>st(i)&&this.parameters.renderOccluded===8],[11,i=>st(i)&&this.parameters.renderOccluded===8],[4,i=>Re(i)&&this.parameters.writeDepth&&this.parameters.renderOccluded!==8],[8,i=>Re(i)&&!this.parameters.writeDepth&&this.parameters.renderOccluded!==8],[18,i=>$i(i)]]),this._configuration=new P(a)}updateConfiguration(e){super.updateConfiguration(e);const a=e.slot===18,i=this.parameters.stipplePattern!=null&&this.parameters.stippleTexture!=null&&e.output!==10,n=i&&a&&this.parameters.isImagePattern();this._configuration.draped=a,this._configuration.polygonOffset=this.parameters.polygonOffset,this._configuration.stippleEnabled=i,this._configuration.stippleOffColorEnabled=i&&this.parameters.stippleOffColor!=null,this._configuration.stipplePreferContinuous=i&&this.parameters.stipplePreferContinuous,this._configuration.numJoinSubdivisions=Ot(this.parameters.join,i),this._configuration.hasSlicePlane=this.parameters.hasSlicePlane,this._configuration.roundJoins=this.parameters.join==="round",this._configuration.capType=this.parameters.cap,this._configuration.applyMarkerOffset=this.parameters.markerParameters!=null&&Fa(this.parameters.markerParameters),this._configuration.polygonOffsetIndex=this.parameters.polygonOffsetIndex,this._configuration.writeDepth=this.parameters.writeDepth,this._configuration.hasVVSize=this.parameters.hasVVSize,this._configuration.hasVVColor=this.parameters.hasVVColor,this._configuration.hasVVOpacity=this.parameters.hasVVOpacity,this._configuration.innerColorEnabled=this.parameters.innerWidth>0&&this.parameters.innerColor!=null,this._configuration.falloffEnabled=this.parameters.falloff>0,this._configuration.hasOccludees=e.hasOccludees,this._configuration.occluder=this.parameters.renderOccluded===8,this._configuration.wireframe=this.parameters.wireframe,this._configuration.animation=this.parameters.animation,this._configuration.emissionSource=this.emissions?1:0,this._configuration.hasScreenSizePerspective=!!this.parameters.screenSizePerspective&&!n,this._configuration.worldSizedImagePattern=n}get visible(){return this.parameters.color[3]>=ot||this.parameters.stipplePattern!=null&&(this.parameters.stippleOffColor?.[3]??0)>ot}get emissions(){return this.parameters.emissiveStrength>0?this.parameters.renderOccluded!==8?2:1:0}setParameters(e,a){e.animation=this.parameters.animation,super.setParameters(e,a)}intersectDraped({attributes:e,screenToWorldRatio:a},i,n,r,l){if(!i.options.selectionMode)return;const d=e.get("size");let o=this.parameters.width;if(this.parameters.vvSize){const g=e.get("sizeFeatureAttribute").data[0];Number.isNaN(g)?o*=this.parameters.vvSize.fallback[0]:o*=Ce(this.parameters.vvSize.offset[0]+g*this.parameters.vvSize.factor[0],this.parameters.vvSize.minSize[0],this.parameters.vvSize.maxSize[0])}else d&&(o*=d.data[0]);const c=n[0],p=n[1],m=(o/2+4)*a;let v=Number.MAX_VALUE,f=0;const h=e.get("position").data,N=Be(this.parameters,e)?h.length-2:h.length-5;for(let g=0;g<N;g+=3){const C=h[g],B=h[g+1],q=(g+3)%h.length,b=c-C,x=p-B,R=h[q]-C,E=h[q+1]-B,u=Ce((R*b+E*x)/(R*R+E*E),0,1),$=R*u-b,V=E*u-x,z=$*$+V*V;z<v&&(v=z,f=g/3)}v<m*m&&r(l.distance,l.renderDistance,l.normal,f)}intersect(e,a,i,n,r,l){const{options:d,camera:o,rayBegin:c,rayEnd:p}=i;if(!d.selectionMode||!e.visible||!o)return;if(!Fi(a))return void Ut.getLogger("esri.views.3d.webgl-engine.materials.RibbonLineMaterial").error("intersection assumes a translation-only matrix");const m=e.attributes,v=m.get("position").data;let f=this.parameters.width;if(this.parameters.vvSize){const x=m.get("sizeFeatureAttribute").data[0];Number.isNaN(x)||(f*=Ce(this.parameters.vvSize.offset[0]+x*this.parameters.vvSize.factor[0],this.parameters.vvSize.minSize[0],this.parameters.vvSize.maxSize[0]))}else m.has("size")&&(f*=m.get("size").data[0]);const h=Aa;Bt(h,i.point);const N=f*o.pixelRatio,g=4*o.pixelRatio,C=N/2+g;ee(fe[0],h[0]-C,h[1]+C,0),ee(fe[1],h[0]+C,h[1]+C,0),ee(fe[2],h[0]+C,h[1]-C,0),ee(fe[3],h[0]-C,h[1]-C,0);for(let x=0;x<4;x++)if(!o.unprojectFromRenderScreen(fe[x],ie[x]))return;ye(o.eye,ie[0],ie[1],Ve),ye(o.eye,ie[1],ie[2],Ie),ye(o.eye,ie[2],ie[3],Me),ye(o.eye,ie[3],ie[0],je);let B=Number.MAX_VALUE,q=0;const b=Be(this.parameters,m)?v.length-2:v.length-5;for(let x=0;x<b;x+=3){I[0]=v[x]+a[12],I[1]=v[x+1]+a[13],I[2]=v[x+2]+a[14];const R=(x+3)%v.length;if(M[0]=v[R]+a[12],M[1]=v[R+1]+a[13],M[2]=v[R+2]+a[14],Z(Ve,I)<0&&Z(Ve,M)<0||Z(Ie,I)<0&&Z(Ie,M)<0||Z(Me,I)<0&&Z(Me,M)<0||Z(je,I)<0&&Z(je,M)<0)continue;const E=o.projectToRenderScreen(I,Ea),u=o.projectToRenderScreen(M,Wa);if(E==null||u==null)continue;if(E[2]<0&&u[2]>0){se(Q,I,M);const z=o.frustum,X=-Z(z[4],I)/Oe(Q,ct(z[4]));if(_e(Q,Q,X),Qe(I,I,Q),!o.projectToRenderScreen(I,E))continue}else if(E[2]>0&&u[2]<0){se(Q,M,I);const z=o.frustum,X=-Z(z[4],M)/Oe(Q,ct(z[4]));if(_e(Q,Q,X),Qe(M,M,Q),!o.projectToRenderScreen(M,u))continue}else if(E[2]<0&&u[2]<0)continue;E[2]=0,u[2]=0;const $=Fe(E,u,St),V=Ei($,h);if(!(V>=B)){if(this.parameters.screenSizePerspective){const z=this.computeScreenSizePerspectiveWidth($,I,M,h,o,f,g);if(V>=z*z)continue}B=V,oe(vt,I),oe(gt,M),q=x/3}}if(B<C*C){let x=Number.MAX_VALUE;if(Wi(Fe(vt,gt,St),Fe(c,p,Va),K)){se(K,K,c);const R=Ke(K);_e(K,K,1/R),x=R/He(c,p)}l(x,x,K,q)}}createBufferWriter(){return new Ra(Ct(this.parameters),this.parameters)}createGLMaterial(e){return new Oa(e)}validateParameters(e){e.join!=="miter"&&(e.miterLimit=0),e.markerParameters!=null&&(e.markerScale=e.markerParameters.width/e.width)}update(e){return!!this.parameters.hasAnimation&&(this.setParameters({timeElapsed:Ht(e.time)},!1),e.dt!==0)}computeScreenSizePerspectiveWidth(e,a,i,n,r,l,d){const o=Vi(e,n);Gt(We,a,i,o),re(mt,We,r.viewMatrix);const c=Ke(mt),p=this.computeCameraAbsCosAngle(We,r,this._configuration.spherical);return ut.update(p,c,this.parameters.screenSizePerspective,this.parameters.screenSizePerspectiveMinPixelReferenceSize),ut.apply(l)*r.pixelRatio/2+d}computeCameraAbsCosAngle(e,a,i){return i?et(K,e):ee(K,0,0,1),se(ze,e,a.eye),et(ze,ze),Math.abs(Oe(K,ze))}};class Oa extends _i{constructor(){super(...arguments),this._stipplePattern=null}dispose(){super.dispose(),this._stippleTextures?.release(this._stipplePattern),this._stipplePattern=null}beginSlot(e){const{stipplePattern:a}=this._material.parameters;return this._stipplePattern!==a&&(this._material.setParameters({stippleTexture:this._stippleTextures.swap(a,this._stipplePattern)}),this._stipplePattern=a),this.getTechnique(Ue,e)}}class _a extends Oi{constructor(){super(...arguments),this._width=0,this.color=qt,this.join="miter",this.cap=0,this.miterLimit=5,this.writeDepth=!0,this.polygonOffset=0,this.polygonOffsetIndex=0,this.stippleTexture=null,this.stipplePreferContinuous=!0,this.markerParameters=null,this.markerScale=1,this.hasSlicePlane=!1,this.vvFastUpdate=!1,this.isClosed=!1,this.falloff=0,this.innerWidth=0,this.wireframe=!1,this.timeElapsed=he(0),this.animation=0,this.animationSpeed=1,this.trailLength=1,this.startTime=he(0),this.endTime=he(1/0),this.emissiveStrength=0}get width(){return this.isImagePattern()?this.stipplePattern.width:this._width}set width(e){this._width=e}get transparent(){return this.color[3]<1||this.hasAnimation||this.stipplePattern!=null&&(this.stippleOffColor?.[3]??0)<1}get hasAnimation(){return this.animation!==0}isImagePattern(){return Pt(this.stipplePattern)&&this.stippleTexture!=null}}class Ra{constructor(e,a){this.layout=e,this._parameters=a,this.numJoinSubdivisions=Ot(this._parameters.join,this._parameters.stipplePattern!=null)}_isClosed(e){return Be(this._parameters,e)}allocate(e){return this.layout.createBuffer(e)}elementCount(e){const i=e.get("position").indices.length/2+1,n=this._isClosed(e);let r=n?2:4;return r+=((n?i:i-1)-(n?0:1))*(2*this.numJoinSubdivisions+4),r+=2,this._parameters.wireframe&&(r=2+4*(r-2)),r}write(e,a,i,n,r){if(r==null)return;const{buffer:l,offset:d}=r,o=this.layout,c=i.get("position"),p=c.indices,m=c.data.length/3,v=i.get("distanceToStart")?.data;p&&p.length!==2*(m-1)&&console.warn("RibbonLineMaterial does not support indices");const f=o.fields.has("sizeFeatureAttribute");let h=1,N=null;if(f){const S=i.get("sizeFeatureAttribute");S.data.length===1?h=S.data[0]:N=S.data}else h=i.get("size")?.data[0]??1;let g=[1,1,1,1],C=0,B=null;const q=o.fields.has("colorFeatureAttribute");if(q){const S=i.get("colorFeatureAttribute");S.data.length===1?C=S.data[0]:B=S.data}else g=i.get("color")?.data??g;const b=i.get("timeStamps")?.data,x=b&&o.fields.has("timeStamps"),R=o.fields.has("opacityFeatureAttribute");let E=0,u=null;if(R){const S=i.get("opacityFeatureAttribute");S.data.length===1?E=S.data[0]:u=S.data}const $=new Float32Array(l.buffer),V=Ai(l.buffer),z=new Uint8Array(l.buffer),X=o.stride/4;let D=d*X;const we=D;let k=0;const Le=v?(S,G,ne)=>k=v[ne]:(S,G,ne)=>k+=He(S,G),ae=$.BYTES_PER_ELEMENT/V.BYTES_PER_ELEMENT,Ye=4/ae,_t=Dt(),H=(S,G,ne,U,me,Rt,ve,Ft)=>{$[D++]=G[0],$[D++]=G[1],$[D++]=G[2],lt(S,G,V,D*ae),D+=Ye,lt(ne,G,V,D*ae),D+=Ye,$[D++]=Ft;let te=D*ae;if(V[te++]=me,V[te++]=Rt,D=Math.ceil(te/ae),q)$[D]=B?.[ve]??C;else{const J=Math.min(4*ve,g.length-4),ge=4*D;z[ge]=255*g[J],z[ge+1]=255*g[J+1],z[ge+2]=255*g[J+2],z[ge+3]=255*g[J+3]}if(D++,$[D++]=N?.[ve]??h,R&&($[D++]=u?.[ve]??E),_t){let J=4*D;n?(z[J++]=n[0],z[J++]=n[1],z[J++]=n[2],z[J++]=n[3]):(z[J++]=0,z[J++]=0,z[J++]=0,z[J++]=0),D=Math.ceil(.25*J)}x&&(te=D*ae,V[te++]=U[0],V[te++]=U[1],V[te++]=U[2],V[te++]=U[3],D=Math.ceil(te/ae))};D+=X,ee(y,c.data[0],c.data[1],c.data[2]),x&&Te(j,b[0],b[1],b[2],b[3]),e&&re(y,y,e);const ue=this._isClosed(i);if(ue){const S=c.data.length-3;ee(F,c.data[S],c.data[S+1],c.data[S+2]),e&&re(F,F,e)}else ee(L,c.data[3],c.data[4],c.data[5]),e&&re(L,L,e),H(y,y,L,j,1,-4,0,0),H(y,y,L,j,1,4,0,0),oe(F,y),oe(y,L),x&&Te(j,b[4],b[5],b[6],b[7]);const $e=ue?0:1,de=ue?m:m-1;for(let S=$e;S<de;S++){const G=(S+1)%m*3;ee(L,c.data[G],c.data[G+1],c.data[G+2]),e&&re(L,L,e),Le(F,y,S),H(F,y,L,j,0,-1,S,k),H(F,y,L,j,0,1,S,k);const ne=this.numJoinSubdivisions;for(let U=0;U<ne;++U){const me=(U+1)/(ne+1);H(F,y,L,j,me,-1,S,k),H(F,y,L,j,me,1,S,k)}if(H(F,y,L,j,1,-2,S,k),H(F,y,L,j,1,2,S,k),oe(F,y),oe(y,L),x){const U=(S+1)%m*4;Te(j,b[U],b[U+1],b[U+2],b[U+3])}}ue?(ee(L,c.data[3],c.data[4],c.data[5]),e&&re(L,L,e),k=Le(F,y,de),H(F,y,L,j,0,-1,$e,k),H(F,y,L,j,0,1,$e,k)):(k=Le(F,y,de),H(F,y,y,j,0,-5,de,k),H(F,y,y,j,0,5,de,k)),Ee($,we+X,$,we,X),D=Ee($,D-X,$,D,X),this._parameters.wireframe&&this._addWireframeVertices(l,we,D,X)}_addWireframeVertices(e,a,i,n){const r=new Float32Array(e.buffer,i*Float32Array.BYTES_PER_ELEMENT),l=new Float32Array(e.buffer,a*Float32Array.BYTES_PER_ELEMENT,i-a);let d=0;const o=c=>d=Ee(l,c,r,d,n);for(let c=0;c<l.length-1;c+=2*n)o(c),o(c+2*n),o(c+1*n),o(c+2*n),o(c+1*n),o(c+3*n)}}function Ee(t,e,a,i,n){for(let r=0;r<n;r++)a[i++]=t[e++];return i}function Be(t,e){return t.isClosed?e.get("position").indices.length>2:!1}function Fa(t){return t.anchor===1&&t.hideOnShortSegments&&t.placement==="begin-end"&&t.worldSpace}function Ot(t,e){const a=e?1:0;switch(t){case"miter":case"bevel":return a;case"round":return Xe+a}}const ut=new Ci,I=_(),M=_(),We=_(),mt=_(),ze=_(),Q=_(),K=_(),Aa=_(),Ea=le(),Wa=le(),vt=_(),gt=_(),St=zt(),Va=zt(),F=_(),y=_(),L=_(),j=yt(),fe=[le(),le(),le(),le()],ie=[_(),_(),_(),_()],Ve=Pe(),Ie=Pe(),Me=Pe(),je=Pe();class hn{constructor(e){this._originSR=e,this._rootOriginId="root/"+Xt(),this._origins=new Map,this._objects=new Map,this._gridSize=5e5,this._originSR?.isGeographic&&(this._gridSize/=Yt(this._originSR)),this._baselineDistance=.5*this._gridSize;const a=this._baselineDistance*Ia;this._baselineObjectSize=a/Ma}getOrigin(e){const a=this._origins.get(this._rootOriginId);if(a==null){const p=pt(e[0]+Math.random()-.5,e[1]+Math.random()-.5,e[2]+Math.random()-.5,this._rootOriginId);return this._origins.set(this._rootOriginId,p),p}const i=this._gridSize,n=Math.round(e[0]/i),r=Math.round(e[1]/i),l=Math.round(e[2]/i),d=`${n}/${r}/${l}`;let o=this._origins.get(d);const c=.5*i;if(se(O,e,a.vec3),O[0]=Math.abs(O[0]),O[1]=Math.abs(O[1]),O[2]=Math.abs(O[2]),O[0]<c&&O[1]<c&&O[2]<c){if(o){const p=Math.max(...O);if(se(O,e,o.vec3),O[0]=Math.abs(O[0]),O[1]=Math.abs(O[1]),O[2]=Math.abs(O[2]),Math.max(...O)<p)return o}return a}return o||(o=pt(n*i,r*i,l*i,d),this._origins.set(d,o)),o}needsOriginUpdate(e,a,i){const n=He(e.vec3,a),r=Math.max(1,i/this._baselineObjectSize);return n>this._baselineDistance*r}_drawOriginBox(e,a=Zt(1,1,0,1)){const i=window.view,n=i.stage,r=a.toString();if(!this._objects.has(r)){this._material=new Ca({width:2,color:a},!1);const f=new ti(n,{pickable:!1}),h=new ii({castShadow:!1});f.add(h),this._objects.set(r,h)}const l=this._objects.get(r),d=[0,1,5,4,0,2,1,7,6,2,0,1,3,7,5,4,6,2,0],o=d.length,c=new Array(3*o),p=new Array,m=.5*this._gridSize;for(let f=0;f<o;f++)c[3*f]=e[0]+(1&d[f]?m:-m),c[3*f+1]=e[1]+(2&d[f]?m:-m),c[3*f+2]=e[2]+(4&d[f]?m:-m),f>0&&p.push(f-1,f);Ne(c,this._originSR,0,c,i.renderSpatialReference,0,o);const v=new Ri(this._material,[["position",new ai(c,p,3,!0)]],null,2);l.addGeometry(v)}get test(){}}const O=_(),Ia=2**-23,Ma=.05,ja=Object.freeze(Object.defineProperty({__proto__:null,build:$t,ribbonlineNumRoundJoinSubdivisions:Xe},Symbol.toStringTag,{value:"Module"}));export{Ki as A,Ca as H,nn as a,cn as b,tn as c,hn as d,la as e,an as f,sn as g,xa as h,La as i,ca as j,Lt as k,en as l,rn as m,Je as n,va as o,Gi as p,pn as q,dn as r,ya as s,pt as t,Tt as u};
