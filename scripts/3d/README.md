# Pipeline do atleta OLYMPUS AI

`generate-olympus-rocketbox-athlete.py` converte o personagem humano rigado,
gera os halteres e produz o clipe `dumbbell-floor-press` em um único GLB.

## Dependências de autoria

- Blender 4.5 LTS;
- avatar `Sports_Male_04` do Microsoft Rocketbox em
  `.tools/rocketbox/Sports_Male_04`;
- Node.js para preparar as texturas.

Os arquivos-fonte de autoria ficam fora do aplicativo. O GLB otimizado é o
único artefato carregado em produção.

## Gerar

```powershell
npm run athlete3d:textures
.\.tools\blender-extract2\blender-4.5.9-windows-x64\blender.exe `
  --background `
  --python scripts\3d\generate-olympus-rocketbox-athlete.py `
  -- `
  --output tmp\rocketbox-build\olympus-athlete.glb `
  --preview-dir tmp\rocketbox-build\previews
```

Depois da inspeção visual, copie o GLB aprovado para
`public/3d/athlete/olympus-athlete.glb` e execute:

```bash
npm run athlete3d:validate
npm run motion:validate
```

O gerador MakeHuman anterior permanece no repositório apenas como pipeline
legado e não é o ativo publicado.

## Proveniência

O avatar-base `Sports_Male_04` pertence à biblioteca Microsoft Rocketbox,
distribuída sob licença MIT. A adaptação Olympus acrescenta texturas próprias,
proporções esportivas, destaque muscular, equipamentos e animação.

- https://github.com/microsoft/Microsoft-Rocketbox
- https://github.com/microsoft/Microsoft-Rocketbox/blob/master/LICENSE.md
