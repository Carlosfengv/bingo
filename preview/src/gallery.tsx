/*
 * Component gallery for the recovered @bingo/ui package.
 *
 * Every component below is unmodified recovered source -- these are the actual
 * Button, Badge, Text, Tabs, Switch, Tooltip, Avatar, ... that Bingo ships,
 * rendered against the compiled stylesheet pulled out of the same bundle. If
 * this page looks like Bingo, the recovery is faithful; if a component
 * throws, the reconstruction is wrong somewhere.
 */
import { useState } from "react";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  ButtonGroup,
  Checkbox,
  Input,
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
  InputGroupText,
  Kbd,
  RippleLoader,
  Separator$2,
  Skeleton,
  Switch,
  Text$4,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  AddVariableIcon,
  ClaudeIcon,
  SearchIcon,
  SparkleIcon,
  TrashIcon,
  WarningIcon$1,
} from "@bingo/ui";

function Section({ title, note, children }) {
  return (
    <section style={{ marginBottom: 40 }}>
      <Text$4 as="h2" size="lg" weight="semibold">
        {title}
      </Text$4>
      {note ? (
        <Text$4 as="p" variant="tertiary" size="xs" style={{ marginTop: 2, marginBottom: 12 }}>
          {note}
        </Text$4>
      ) : (
        <div style={{ height: 12 }} />
      )}
      {children}
    </section>
  );
}

function Row({ children }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 10 }}>
      {children}
    </div>
  );
}

function Panel({ children }) {
  return (
    <div
      style={{
        border: "1px solid var(--color-ed-border, #e5e5e5)",
        borderRadius: 10,
        padding: 18,
        maxWidth: 720,
      }}
    >
      {children}
    </div>
  );
}

export function Gallery() {
  const [checked, setChecked] = useState(true);
  const [on, setOn] = useState(true);
  const [dark, setDark] = useState(
    typeof document !== "undefined" && document.documentElement.classList.contains("editor-dark")
  );

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("editor-dark", next);
    try {
      localStorage.setItem("bingo-editor-theme", next ? "dark" : "light");
    } catch (e) {}
  };

  return (
    <TooltipProvider>
      <div style={{ padding: 32, maxWidth: 900, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <Text$4 as="h1" size="2xl" weight="semibold">
              Bingo — recovered components
            </Text$4>
            <Text$4 as="p" variant="tertiary" size="sm" style={{ marginTop: 4 }}>
              395 files de-bundled from the shipped app · the components below are the real source
            </Text$4>
          </div>
          <Button variant="outline" onClick={toggleTheme}>
            {dark ? "Light" : "Dark"}
          </Button>
        </div>

        <Section title="Buttons" note="Button · ButtonGroup · all cva variants">
          <Panel>
            <Row>
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="destructive">Destructive</Button>
              <Button size="sm">Small</Button>
              <Button size="lg">Large</Button>
              <Button disabled>Disabled</Button>
            </Row>
            <div style={{ height: 14 }} />
            <Row>
              <ButtonGroup>
                <Button variant="outline">Left</Button>
                <Button variant="outline">Middle</Button>
                <Button variant="outline">Right</Button>
              </ButtonGroup>
            </Row>
          </Panel>
        </Section>

        <Section title="Badges & text" note="Badge variants · Text sizes, variants and weights">
          <Panel>
            <Row>
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="outline">Outline</Badge>
              <Badge variant="destructive">Destructive</Badge>
              <Badge variant="warning">Warning</Badge>
            </Row>
            <div style={{ height: 16 }} />
            <Row style={{ alignItems: "baseline" }}>
              <Text$4 size="2xl" weight="semibold">2xl</Text$4>
              <Text$4 size="xl" weight="medium">xl</Text$4>
              <Text$4 size="lg">lg</Text$4>
              <Text$4 size="md">md</Text$4>
              <Text$4 size="sm">sm</Text$4>
              <Text$4 size="xs">xs</Text$4>
              <Text$4 size="2xs">2xs</Text$4>
            </Row>
            <div style={{ height: 10 }} />
            <Row>
              <Text$4 variant="primary">primary</Text$4>
              <Text$4 variant="secondary">secondary</Text$4>
              <Text$4 variant="tertiary">tertiary</Text$4>
              <Text$4 variant="accent">accent</Text$4>
              <Text$4 variant="danger">danger</Text$4>
              <Text$4 variant="success">success</Text$4>
            </Row>
          </Panel>
        </Section>

        <Section title="Form controls" note="Input · InputGroup · Checkbox · Switch">
          <Panel>
            <Row>
              <Input placeholder="Project name" style={{ maxWidth: 260 }} />
              <InputGroup style={{ maxWidth: 260 }}>
                <InputGroupAddon>
                  <InputGroupText>
                    <SearchIcon size={14} />
                  </InputGroupText>
                </InputGroupAddon>
                <InputGroupInput placeholder="Search components" />
              </InputGroup>
            </Row>
            <div style={{ height: 16 }} />
            <Row>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Checkbox checked={checked} onCheckedChange={setChecked} />
                <Text$4 size="sm">Enable component editing</Text$4>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Switch checked={on} onCheckedChange={setOn} />
                <Text$4 size="sm">Follow the agent</Text$4>
              </label>
            </Row>
          </Panel>
        </Section>

        <Section title="Tabs" note="Radix tabs, recovered styling">
          <Panel>
            <Tabs defaultValue="design">
              <TabsList>
                <TabsTrigger value="design">Design</TabsTrigger>
                <TabsTrigger value="css">CSS</TabsTrigger>
                <TabsTrigger value="classes">Classes</TabsTrigger>
              </TabsList>
              <TabsContent value="design">
                <Text$4 size="sm" variant="tertiary">Style inspector — design tab</Text$4>
              </TabsContent>
              <TabsContent value="css">
                <Text$4 size="sm" variant="tertiary">Style inspector — CSS tab</Text$4>
              </TabsContent>
              <TabsContent value="classes">
                <Text$4 size="sm" variant="tertiary">Style inspector — classes tab</Text$4>
              </TabsContent>
            </Tabs>
          </Panel>
        </Section>

        <Section title="Tooltip, avatar, misc" note="Tooltip · Avatar · Kbd · Separator · Skeleton · RippleLoader">
          <Panel>
            <Row>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm">Hover me</Button>
                </TooltipTrigger>
                <TooltipContent>Rebuilt from the bundle</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <TrashIcon size={15} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete layer</TooltipContent>
              </Tooltip>
              <Kbd>⌘</Kbd>
              <Kbd>K</Kbd>
            </Row>
            <div style={{ height: 16 }} />
            <Row>
              <Avatar>
                <AvatarImage src="" alt="" />
                <AvatarFallback>BI</AvatarFallback>
              </Avatar>
              <Button variant="ghost" size="icon">
                <ClaudeIcon size={18} />
              </Button>
              <Button variant="ghost" size="icon">
                <SparkleIcon size={18} />
              </Button>
              <Button variant="ghost" size="icon">
                <AddVariableIcon size={18} />
              </Button>
              <RippleLoader />
            </Row>
            <div style={{ height: 16 }} />
            <Separator$2 />
            <div style={{ height: 16 }} />
            <Row>
              <Skeleton style={{ width: 180, height: 32 }} />
              <Skeleton style={{ width: 90, height: 32 }} />
            </Row>
            <div style={{ height: 16 }} />
            <Row>
              <Text$4 variant="warning" size="xs" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <WarningIcon$1 size={14} /> Component failed to render — kept last good version
              </Text$4>
            </Row>
          </Panel>
        </Section>

        <Text$4 as="p" variant="tertiary" size="2xs">
          Rendered from packages/ui/src · stylesheet from src/renderer/src/index.css
        </Text$4>
      </div>
    </TooltipProvider>
  );
}
