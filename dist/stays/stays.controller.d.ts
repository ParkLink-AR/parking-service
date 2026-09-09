import { StaysService } from './stays.service';
import { StayQuoteQueryDto } from './dto/stay-quote-query.dto';
export declare class StaysController {
    private readonly staysService;
    constructor(staysService: StaysService);
    getQuote(id: string, query: StayQuoteQueryDto): Promise<import("./stays.service").StayQuote>;
}
