const TAROT_CARDS = [
  { id: 0, name: '愚者', nameEn: 'The Fool', upright: '新开始、自由、冒险、信任未知', reversedMeaning: '轻率、逃避、方向未明', image: '../tarot/assets/cards/0.svg' },
  { id: 1, name: '魔法师', nameEn: 'The Magician', upright: '意志、创造、资源整合、行动力', reversedMeaning: '操控、分心、能力未发挥', image: '../tarot/assets/cards/1.svg' },
  { id: 2, name: '女祭司', nameEn: 'The High Priestess', upright: '直觉、秘密、内在智慧、静观', reversedMeaning: '直觉受阻、隐瞒、表象迷雾', image: '../tarot/assets/cards/2.svg' },
  { id: 3, name: '女皇', nameEn: 'The Empress', upright: '丰盛、滋养、创造、关系生长', reversedMeaning: '过度依赖、停滞、照顾失衡', image: '../tarot/assets/cards/3.svg' },
  { id: 4, name: '皇帝', nameEn: 'The Emperor', upright: '秩序、边界、责任、稳定结构', reversedMeaning: '控制、僵硬、权力失衡', image: '../tarot/assets/cards/4.svg' },
  { id: 5, name: '教皇', nameEn: 'The Hierophant', upright: '传统、承诺、学习、精神指引', reversedMeaning: '质疑规则、固执、信念冲突', image: '../tarot/assets/cards/5.svg' },
  { id: 6, name: '恋人', nameEn: 'The Lovers', upright: '选择、亲密、价值一致、连接', reversedMeaning: '失和、犹豫、价值冲突', image: '../tarot/assets/cards/6.svg' },
  { id: 7, name: '战车', nameEn: 'The Chariot', upright: '胜利、意志、自律、掌控方向', reversedMeaning: '失控、急躁、目标混乱', image: '../tarot/assets/cards/7.svg' },
  { id: 8, name: '力量', nameEn: 'Strength', upright: '勇气、温柔的力量、耐心、自信', reversedMeaning: '自我怀疑、压抑、能量低落', image: '../tarot/assets/cards/8.svg' },
  { id: 9, name: '隐士', nameEn: 'The Hermit', upright: '内省、智慧、独处、寻找真相', reversedMeaning: '孤立、退缩、拒绝帮助', image: '../tarot/assets/cards/9.svg' },
  { id: 10, name: '命运之轮', nameEn: 'Wheel of Fortune', upright: '转机、循环、机缘、变化到来', reversedMeaning: '抗拒变化、延迟、重复旧模式', image: '../tarot/assets/cards/10.svg' },
  { id: 11, name: '正义', nameEn: 'Justice', upright: '公平、真相、因果、清晰判断', reversedMeaning: '失衡、逃避责任、判断偏差', image: '../tarot/assets/cards/11.svg' },
  { id: 12, name: '倒吊人', nameEn: 'The Hanged Man', upright: '暂停、换位思考、放下、等待', reversedMeaning: '拖延、牺牲失衡、抗拒放手', image: '../tarot/assets/cards/12.svg' },
  { id: 13, name: '死神', nameEn: 'Death', upright: '结束、转化、蜕变、新阶段', reversedMeaning: '抗拒改变、停滞、旧事未了', image: '../tarot/assets/cards/13.svg' },
  { id: 14, name: '节制', nameEn: 'Temperance', upright: '平衡、调和、耐心、温和推进', reversedMeaning: '过度、失衡、节奏混乱', image: '../tarot/assets/cards/14.svg' },
  { id: 15, name: '恶魔', nameEn: 'The Devil', upright: '束缚、欲望、执念、看见阴影', reversedMeaning: '松绑、觉醒、摆脱旧限制', image: '../tarot/assets/cards/15.svg' },
  { id: 16, name: '塔', nameEn: 'The Tower', upright: '突变、打破旧结构、真相显露', reversedMeaning: '延迟崩塌、内在震荡、逃避冲击', image: '../tarot/assets/cards/16.svg' },
  { id: 17, name: '星星', nameEn: 'The Star', upright: '希望、疗愈、灵感、重新相信', reversedMeaning: '失望、信心不足、希望被遮蔽', image: '../tarot/assets/cards/17.svg' },
  { id: 18, name: '月亮', nameEn: 'The Moon', upright: '潜意识、迷雾、直觉、梦境讯息', reversedMeaning: '真相浮现、恐惧松动、内心澄清', image: '../tarot/assets/cards/18.svg' },
  { id: 19, name: '太阳', nameEn: 'The Sun', upright: '喜悦、明朗、成功、生命力', reversedMeaning: '延迟的快乐、过度乐观、能量不足', image: '../tarot/assets/cards/19.svg' },
  { id: 20, name: '审判', nameEn: 'Judgement', upright: '觉醒、召唤、复盘、新生', reversedMeaning: '自我怀疑、抗拒回应、迟疑', image: '../tarot/assets/cards/20.svg' },
  { id: 21, name: '世界', nameEn: 'The World', upright: '完成、整合、成就、阶段圆满', reversedMeaning: '未完成、收尾拖延、缺少整合', image: '../tarot/assets/cards/21.svg' }
];

function shuffledCards() {
  const cards = TAROT_CARDS.map(card => ({ ...card, reversed: Math.random() < 0.32 }));
  for (let i = cards.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cards[i], cards[j]] = [cards[j], cards[i]];
  }
  return cards;
}
