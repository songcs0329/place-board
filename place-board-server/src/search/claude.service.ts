import Anthropic from '@anthropic-ai/sdk';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface Candidate {
  name: string;
  area: string;
  summary: string;
  blogIds: number[];
}

export interface BlogForPrompt {
  id: number;
  title: string;
  description: string;
}

const QUERIES_SYSTEM = `너는 네이버 블로그 검색어를 만든다.
사용자의 장소 요청을 블로그 검색어 3~5개로 바꿔라.
- "경기도 외곽"처럼 넓은 지역은 구체적인 시·군(예: 양평, 가평, 파주)으로 나눈다.
- 지역이 없으면 요청의 분위기·업종 키워드 조합만으로 만든다.
- 각 검색어는 2~4단어, 지역 + 업종 + 분위기 키워드 형태.`;

const EXTRACT_SYSTEM = `너는 블로그 후기에서 가게를 뽑는다.
사용자 요청에 맞는 실제 가게를 최대 15곳 뽑아라.
- name: 상호명만. 블로그 제목의 수식어는 빼고, 지점명은 있으면 포함.
- area: 그 가게의 지역명(시·군·구 또는 읍·면·동). 후기에 없으면 검색어의 지역.
- summary: 후기 내용만 근거로 분위기·특징 한 줄, 25자 이내. 과장하거나 후기에 없는 내용을 추측하지 않는다.
- blogIds: 그 가게를 언급한 후기 번호.
- 요청과 맞지 않거나 상호를 확실히 알 수 없으면 뺀다. 같은 가게는 한 번만.`;

// structured outputs: Sonnet 5.5는 tool_choice 강제가 400이라 output_config.format으로 JSON을 받는다
@Injectable()
export class ClaudeService {
  private readonly client = new Anthropic();

  constructor(private readonly config: ConfigService) {}

  async blogQueries(query: string): Promise<string[]> {
    const out = await this.json<{ queries: string[] }>(QUERIES_SYSTEM, `요청: ${query}`, 1000, {
      type: 'object',
      properties: { queries: { type: 'array', items: { type: 'string' } } },
      required: ['queries'],
      additionalProperties: false,
    });
    return out.queries.map((q) => q.trim()).filter(Boolean).slice(0, 5);
  }

  async extractPlaces(query: string, blogs: BlogForPrompt[]): Promise<Candidate[]> {
    const list = blogs.map((b) => `[${b.id}] ${b.title} | ${b.description}`).join('\n');
    const out = await this.json<{ places: Candidate[] }>(EXTRACT_SYSTEM, `요청: ${query}\n\n후기:\n${list}`, 4000, {
      type: 'object',
      properties: {
        places: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              area: { type: 'string' },
              summary: { type: 'string' },
              blogIds: { type: 'array', items: { type: 'integer' } },
            },
            required: ['name', 'area', 'summary', 'blogIds'],
            additionalProperties: false,
          },
        },
      },
      required: ['places'],
      additionalProperties: false,
    });
    return out.places.slice(0, 15);
  }

  private async json<T>(system: string, user: string, maxTokens: number, schema: Record<string, unknown>): Promise<T> {
    const res = await this.client.messages.create({
      model: this.config.getOrThrow<string>('CLAUDE_MODEL'),
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
      output_config: { format: { type: 'json_schema', schema }, effort: 'low' },
    });
    const text = res.content.find((b) => b.type === 'text');
    if (res.stop_reason !== 'end_turn' || !text) throw new Error(`claude stop_reason=${res.stop_reason}`);
    return JSON.parse(text.text) as T;
  }
}
