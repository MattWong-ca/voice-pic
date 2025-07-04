import { Hono } from 'hono';
import Replicate from 'replicate';

const app = new Hono<{ Bindings: Env }>();

const DEFAULT_INSTRUCTIONS = `You are helpful and have some tools installed.

In the tools you have the ability to control a robot hand.
`;

app.post('/rtc-connect', async (c) => {
	const body = await c.req.text();
	const url = new URL('https://api.openai.com/v1/realtime');
	url.searchParams.set('model', 'gpt-4o-realtime-preview-2024-12-17');
	url.searchParams.set('instructions', DEFAULT_INSTRUCTIONS);
	url.searchParams.set('voice', 'ash');

	const response = await fetch(url.toString(), {
		method: 'POST',
		body,
		headers: {
			Authorization: `Bearer ${c.env.OPENAI_API_KEY}`,
			'Content-Type': 'application/sdp',
		},
	});

	if (!response.ok) {
		throw new Error(`OpenAI API error: ${response.status}`);
	}
	const sdp = await response.text();
	return c.body(sdp, {
		headers: {
			'Content-Type': 'application/sdp',
		},
	});
});


app.post('/generate-image', async (c) => {
	const replicate = new Replicate({auth: c.env.REPLICATE_API_TOKEN})
	const model = 'black-forest-labs/flux-schnell'  
	const prompt = await c.req.text()
	const output = await replicate.run(model, {
	  input: {
		prompt,
		image_format: 'webp',
	  }
	})
	  
	// Some image models return an array of output files, others just a single file.
	const imageUrl = Array.isArray(output) ? output[0].url() : output.url()
   
	console.log({imageUrl})

	return c.body(imageUrl, {
		headers: {
			'Content-Type': 'image/webp',
		},
	});
});

app.post('/edit-image', async (c) => {
	const replicate = new Replicate({ auth: c.env.REPLICATE_API_TOKEN });
	const model = 'black-forest-labs/flux-kontext-pro';
	const { prompt, imageUrl } = await c.req.json();

	if (!prompt || !imageUrl) {
		return c.json({ error: 'prompt and imageUrl are required' }, 400);
	}

	const input = {
		prompt,
		input_image: imageUrl,
		aspect_ratio: 'match_input_image',
		safety_tolerance: 2,
	}

	console.log({input})

	const output = (await replicate.run(model, { input })) as unknown as string;

	// Some image models return an array of output files, others just a single file.
	const outputImageUrl = Array.isArray(output) ? output[0].url() : output.url()

	return c.body(outputImageUrl, {
		headers: {
			'Content-Type': 'image/webp',
		},
	});
});

export default app;
